using System.Diagnostics;
using System.Drawing;
using System.Text.Json;
using System.Windows.Automation;

namespace DesktopNative;

// The model sees only the initial/final images. Between steps we check cheap
// window and UIA metadata, never ask the model to interpret another image.
internal sealed class VisualBatch(WindowsUi ui, Safety safety)
{
    private sealed record View(nint Window, int Pid, Rectangle Bounds, int Width, int Height,
        string Observation, string Title, string? Layout, DateTime At);
    private readonly Dictionary<string, View> views = new();
    internal object Observe(nint hwnd, Arguments a) {
        if (a.Text("scope") == "desktop") throw new InvalidOperationException("WINDOW_CAPTURE_REQUIRED: choose one target window.");
        var frame = Capture.Take(hwnd, a);
        var observation = ui.Observe(hwnd);
        var id = Guid.NewGuid().ToString("N");
        foreach (var old in views.Where(p => p.Value.Window == hwnd || DateTime.UtcNow - p.Value.At > TimeSpan.FromMinutes(1)).Select(p => p.Key).ToArray()) views.Remove(old);
        if (views.Count >= 16) views.Clear();
        var layout = Layout(hwnd);
        views[id] = new(hwnd, Native.Pid(hwnd), frame.Bounds, frame.Width, frame.Height,
            observation, Native.Title(hwnd), layout, DateTime.UtcNow);
        return new { screenshotId = id, coordinateSpace = "screenshot-pixels", layoutGuard = layout is null ? "unavailable" : "uia",
            screenshot = Capture.Image(frame), window = ui.Window(hwnd, false),
            note = "Inspect this image. Use run_batch for a short predictable sequence; checkpoint after navigation/submission. UIA cannot detect every visual change." };
    }
    // Ignore editable values and focus, but notice changed controls, labels and
    // geometry. Unknown/partial UIA is explicitly reported, not treated as proof.
    internal string? Layout(nint hwnd, int maxNodes = 160, int budgetMs = 1000) {
        try {
            var walker = TreeWalker.ControlViewWalker;
            var pending = new Stack<AutomationElement>(); pending.Push(ui.Root(hwnd));
            var items = new List<string>(); var watch = Stopwatch.StartNew();
            while (pending.Count > 0) {
                if (items.Count >= maxNodes || watch.ElapsedMilliseconds > budgetMs) return null;
                var node = pending.Pop(); var c = node.Current;
                if (c.IsOffscreen) continue;
                var name = c.ControlType == ControlType.Edit || c.IsPassword ? "" : c.Name;
                items.Add($"{c.ControlType.Id}|{c.AutomationId}|{name}|{c.BoundingRectangle}");
                var child = walker.GetFirstChild(node);
                while (child is not null) {
                    if (pending.Count + items.Count >= maxNodes || watch.ElapsedMilliseconds > budgetMs) return null;
                    pending.Push(child); child = walker.GetNextSibling(child);
                }
            }
            return string.Join("\n", items);
        } catch (Exception e) when (e is ElementNotAvailableException or InvalidOperationException or System.Runtime.InteropServices.COMException) { return null; }
    }
    private void Check(View view, bool layout = true) {
        safety.Check();
        if (!Native.IsWindow(view.Window) || Native.Pid(view.Window) != view.Pid) throw new InvalidOperationException("TARGET_UNAVAILABLE");
        if (Native.Bounds(view.Window) != view.Bounds) throw new InvalidOperationException("WINDOW_MOVED: obtain a new screenshot.");
        ui.AssertForeground(view.Window);
        if (Native.Title(view.Window) != view.Title) throw new InvalidOperationException("VIEW_CHANGED: window title changed.");
        if (layout && view.Layout is not null) {
            var current = Layout(view.Window);
            if (current is null) throw new InvalidOperationException("VIEW_CHANGED: control inspection incomplete.");
            if (current != view.Layout) throw new InvalidOperationException("VIEW_CHANGED: controls changed.");
        }
    }
    internal object Run(nint hwnd, Arguments a) {
        if (!views.TryGetValue(a.Text("screenshotId"), out var view) || view.Window != hwnd ||
            DateTime.UtcNow - view.At > TimeSpan.FromMinutes(1))
            throw new InvalidOperationException("STALE_SCREENSHOT: obtain a fresh window screenshot.");
        var actions = a.Array("actions").ToArray();
        if (actions.Length is < 1 or > 8) throw new InvalidOperationException("INVALID_BATCH_SIZE");
        // Validate/transform every step before the first side effect.
        var prepared = actions.Select(step => Prepare(step, view)).ToArray();
        ui.CheckTarget(hwnd, new Arguments(JsonSerializer.SerializeToElement(new { observationId = view.Observation })), true);
        Check(view);
        views.Remove(a.Text("screenshotId")); // single-use, including partial failure
        var input = new InputActions(ui, safety);
        var steps = new List<object>(); string? reason = null; var completed = 0; var attempted = 0;
        var watch = Stopwatch.StartNew();
        foreach (var (action, args, checkpoint) in prepared) {
            try {
                Check(view);
                if (watch.ElapsedMilliseconds > 15000) throw new InvalidOperationException("BATCH_TIME_LIMIT");
                attempted++;
                object result = action switch {
                    "click" or "double_click" or "move" or "scroll" => input.Pointer(action, hwnd, args),
                    "type_text" => input.Type(hwnd, args),
                    "keypress" => input.Keys(hwnd, args),
                    "wait" => Wait(args),
                    _ => throw new InvalidOperationException("UNSUPPORTED_BATCH_ACTION")
                };
                completed++;
                steps.Add(new { index = attempted - 1, action, status = "sent", result });
                safety.Delay(60);
                Check(view);
                if (checkpoint || action == "scroll" || (action == "keypress" && args.Array("keys").Any(k => k.GetString()?.ToLowerInvariant() is "enter" or "return" or "escape" or "esc"))) {
                    reason = "CHECKPOINT: inspect the returned image before continuing."; break;
                }
            } catch (Exception e) {
                reason = e.Message;
                steps.Add(new { index = completed, action, status = attempted > completed ? "failed_or_partial" : "stopped", error = reason });
                break;
            }
        }
        object? observation = null; string? captureError = null;
        try {
            if (Native.IsWindow(hwnd) && Native.Pid(hwnd) == view.Pid)
                observation = Observe(hwnd, new Arguments(JsonSerializer.SerializeToElement(new { maxWidth = view.Width })));
            else captureError = "TARGET_UNAVAILABLE";
        } catch (Exception e) { captureError = e.Message; }
        // Flatten final image for the MCP adapter. Partial batches are data, not
        // thrown MCP errors, so DSH retains their final image and step evidence.
        var final = observation is null ? default : JsonSerializer.SerializeToElement(observation);
        return new {
            status = reason is null ? "completed" : reason.StartsWith("CHECKPOINT") ? "checkpoint" : "stopped",
            completed, attempted, remaining = actions.Length - completed, reason, steps,
            verification = "inspect_final_screenshot", layoutGuard = view.Layout is null ? "unavailable" : "uia",
            screenshotId = observation is null ? null : final.GetProperty("screenshotId").GetString(),
            coordinateSpace = "screenshot-pixels",
            screenshot = observation is null ? (object?)null : final.GetProperty("screenshot"),
            window = observation is null ? (object?)null : final.GetProperty("window"), captureError,
            note = "Never replay the whole batch. Inspect the final image and plan only unfinished actions."
        };
    }
    private object Wait(Arguments args) { safety.Delay(args.Int("milliseconds")); return new { waited = true }; }
    private static (string Action, Arguments Args, bool Checkpoint) Prepare(JsonElement step, View view) {
        var action = step.GetProperty("action").GetString()!;
        var values = step.EnumerateObject().Where(p => p.Name is not ("action" or "checkpoint")).ToDictionary(p => p.Name, p => (object?)p.Value);
        values["nativeWindowHandle"] = (long)view.Window; values["activate"] = false;
        if (action is "click" or "double_click" or "move" or "scroll") {
            var x = step.GetProperty("x").GetInt32(); var y = step.GetProperty("y").GetInt32();
            if (x < 0 || y < 0 || x >= view.Width || y >= view.Height) throw new InvalidOperationException("POINT_OUTSIDE_SCREENSHOT");
            values["x"] = view.Bounds.X + (int)Math.Floor((double)x * view.Bounds.Width / view.Width);
            values["y"] = view.Bounds.Y + (int)Math.Floor((double)y * view.Bounds.Height / view.Height);
        } else if (action == "type_text") {
            if (step.GetProperty("text").GetString()!.Length > 5000) throw new InvalidOperationException("TEXT_TOO_LONG");
            values["method"] = "sendinput";
        } else if (action == "wait") {
            var ms = step.GetProperty("milliseconds").GetInt32();
            if (ms is < 0 or > 1000) throw new InvalidOperationException("INVALID_WAIT");
        } else if (action == "keypress") {
            InputActions.ValidateChord(step.GetProperty("keys").EnumerateArray().Select(k => k.GetString()!).ToArray());
        } else throw new InvalidOperationException("UNSUPPORTED_BATCH_ACTION");
        return (action, new Arguments(JsonSerializer.SerializeToElement(values)), step.TryGetProperty("checkpoint", out var check) && check.GetBoolean());
    }
}
