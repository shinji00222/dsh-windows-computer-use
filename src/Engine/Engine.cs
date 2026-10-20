using System.Diagnostics;
using System.Text.Json;
using System.Windows.Automation;
namespace DesktopNative;
internal sealed class Engine(Safety safety)
{
    private readonly WindowsUi ui = new(safety);
    private VisualBatch? visual;
    private TextBatch? text;
    internal object Execute(string action, Arguments a, string turn, bool indicator) {
        if (action == "health") {
            Native.GetCursorPos(out var cursor);
            return new { engine = "C#", version = "0.1.0-preview.4", platform = "Windows", stopListener = safety.ListenerAlive, escapeEvents = safety.EscapeEvents, foregroundWindow = (long)Native.GetForegroundWindow(), processId = Environment.ProcessId, cursor = new { x = cursor.X, y = cursor.Y } };
        }
        if (action == "resume") { safety.Resume(turn); return new { resumed = true }; }
        using var lease = safety.Enter(turn, indicator);
        if (action == "wait") { safety.Delay(Math.Clamp(a.Int("milliseconds", 500), 1, 30000)); return new { waited = true }; }
        if (action == "list_windows") return new { windows = ui.Enumerate(a).Take(a.Int("maxWindows", 50)).Select(h => ui.Window(h)).ToArray() };
        if (action == "wait_for") return WaitFor(a);
        var hwnd = ui.Target(a);
        visual ??= new VisualBatch(ui, safety);
        if (action == "run_batch") return visual.Run(hwnd, a);
        text ??= new TextBatch(ui, safety);
        if (action == "observe_text") return text.Observe(hwnd, a);
        if (action == "run_text_batch") return text.Run(hwnd, a);
        var input = new InputActions(ui, safety);
        switch (action) {
            case "snapshot": case "accessibility_tree": case "find": {
                if (a.Bool("activate")) ui.Activate(hwnd);
                var tree = ui.Tree(hwnd, a, action == "find" ? a.Text("query") : null);
                object? ocr = null;
                if (action == "find" && a.Bool("ocrFallback", true) && tree.Nodes.Count == 0 && !a.Has("controlType")) ocr = Capture.Ocr(Capture.Take(hwnd, a), a);
                return new { nodes = tree.Nodes, results = action == "find" ? tree.Nodes : null, truncated = tree.Truncated, truncationReason = tree.Reason,
                    window = ui.Window(hwnd, false), ocr, screenshot = action == "snapshot" && a.Bool("includeScreenshot", true) ? Capture.Image(Capture.Take(hwnd, a)) : null };
            }
            case "screenshot": case "ocr": {
                if (a.Bool("activate")) ui.Activate(hwnd);
                if (action == "screenshot" && a.Text("scope") != "desktop") return visual.Observe(hwnd, a);
                ui.Observe(hwnd); var frame = Capture.Take(hwnd, a);
                return action == "screenshot" ? new { screenshot = Capture.Image(frame), window = ui.Window(hwnd, false) } :
                    new { ocr = Capture.Ocr(frame, a), screenshot = a.Bool("includeScreenshot") ? Capture.Image(frame) : null, window = ui.Window(hwnd, false) };
            }
            case "element_info": {
                ui.Observe(hwnd);
                var element = a.Has("elementId") ? ui.Element(a.Text("elementId"), hwnd) : AutomationElement.FromPoint(new System.Windows.Point(a.Int("x"), a.Int("y")));
                if (element.Current.ProcessId != Native.Pid(hwnd)) throw new InvalidOperationException("ELEMENT_OUTSIDE_TARGET");
                return ui.Info(element, hwnd);
            }
            case "activate_window": ui.CheckTarget(hwnd, a); ui.Activate(hwnd); return new { verification = "observed", activated = true };
            case "click": case "double_click": case "move": case "scroll": return input.Pointer(action, hwnd, a);
            case "drag": return input.Drag(hwnd, a);
            case "type_text": return input.Type(hwnd, a);
            case "keypress": return input.Keys(hwnd, a);
            case "focus": case "invoke": case "set_value": return input.ElementAction(action, hwnd, a);
            case "close_window":
                ui.CheckTarget(hwnd, a);
                if (!Native.PostMessage(hwnd, 0x10, 0, 0)) throw new InvalidOperationException("CLOSE_REJECTED");
                ui.Invalidate(hwnd); return new { verification = "sent", note = "The application may show a save dialog; observe again." };
            case "move_window":
                ui.CheckTarget(hwnd, a);
                if (!Native.SetWindowPos(hwnd, 0, a.Int("x"), a.Int("y"), 0, 0, 0x15)) throw new InvalidOperationException("MOVE_REJECTED");
                ui.Invalidate(hwnd); return new { verification = "sent", note = "Re-observe before coordinate input." };
            default: throw new InvalidOperationException("UNKNOWN_ACTION");
        }
    }
    private object WaitFor(Arguments a) {
        var watch = Stopwatch.StartNew(); var condition = a.Text("condition", "window"); var appear = a.Bool("appear", true);
        if (condition == "window" && !a.HasTarget) throw new InvalidOperationException("TARGET_REQUIRED");
        if (condition != "window" && string.IsNullOrWhiteSpace(a.Text("query"))) throw new InvalidOperationException("QUERY_REQUIRED");
        while (true) {
            safety.Check(); bool found = false, conclusive = true;
            try {
                var hwnd = ui.Target(a, condition == "window");
                if (condition == "window") { ui.Observe(hwnd); found = true; }
                else if (condition == "element") { var tree = ui.Tree(hwnd, a, a.Text("query")); found = tree.Nodes.Count > 0; conclusive = found || !tree.Truncated; }
                else {
                    var ocr = JsonSerializer.SerializeToElement(Capture.Ocr(Capture.Take(hwnd, a), a));
                    found = ocr.GetProperty("matched").GetArrayLength() > 0;
                }
            } catch (InvalidOperationException e) when (e.Message == "WINDOW_NOT_FOUND") { found = false; }
            if (found == appear && conclusive) return new { verification = "observed", found, waitedMs = watch.ElapsedMilliseconds };
            if (watch.ElapsedMilliseconds >= a.Int("timeoutMs", 5000)) return new { verification = "unconfirmed", found, conclusive, timedOut = true, waitedMs = watch.ElapsedMilliseconds };
            safety.Delay(Math.Min(a.Int("intervalMs", 250), Math.Max(1, a.Int("timeoutMs", 5000) - (int)watch.ElapsedMilliseconds)));
        }
    }
}
