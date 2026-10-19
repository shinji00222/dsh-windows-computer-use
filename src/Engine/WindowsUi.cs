using System.Diagnostics;
using System.Windows.Automation;
using Drawing = System.Drawing;

namespace DesktopNative;
internal sealed class WindowsUi(Safety safety)
{
    private sealed record ElementRef(AutomationElement Element, nint Window, int Pid, DateTime At);
    private sealed record Observation(int Pid, Drawing.Rectangle Bounds, string Token, DateTime At);
    private readonly Dictionary<string, ElementRef> elements = new();
    private readonly Dictionary<nint, Observation> observed = new();
    internal static object Box(Drawing.Rectangle r) => new { x = r.X, y = r.Y, width = r.Width, height = r.Height, centerX = r.X + r.Width / 2, centerY = r.Y + r.Height / 2 };
    internal static Drawing.Rectangle Rect(System.Windows.Rect r) => r.IsEmpty ? Drawing.Rectangle.Empty : Drawing.Rectangle.FromLTRB((int)r.Left, (int)r.Top, (int)r.Right, (int)r.Bottom);
    internal string Observe(nint hwnd) {
        var token = Guid.NewGuid().ToString("N");
        observed[hwnd] = new(Native.Pid(hwnd), Native.Bounds(hwnd), token, DateTime.UtcNow);
        if (elements.Count > 5000) elements.Clear();
        return token;
    }
    internal object Window(nint hwnd, bool remember = true) => new {
        nativeWindowHandle = (long)hwnd, processId = Native.Pid(hwnd), name = Native.Title(hwnd),
        boundingBox = Box(Native.Bounds(hwnd)), targetResponsive = !Native.IsHungAppWindow(hwnd),
        observationId = remember ? Observe(hwnd) : null
    };
    internal List<nint> Enumerate(Arguments a) {
        var list = new List<nint>();
        Native.EnumWindows((h, _) => {
            if (Native.Pid(h) == Environment.ProcessId || (!a.Bool("includeInvisible") && !Native.IsWindowVisible(h))) return true;
            if (string.IsNullOrWhiteSpace(Native.Title(h))) return true;
            list.Add(h); return true;
        }, 0);
        return list;
    }
    internal nint Target(Arguments a, bool required = false) {
        if (!a.HasTarget) {
            if (required) throw new InvalidOperationException("TARGET_REQUIRED: specify HWND, PID or windowTitle.");
            var foreground = Native.GetForegroundWindow();
            if (foreground == 0) throw new InvalidOperationException("NO_FOREGROUND_WINDOW");
            return foreground;
        }
        var found = Enumerate(a).Where(h =>
            (!a.Has("nativeWindowHandle") || (long)h == a.Long("nativeWindowHandle")) &&
            (!a.Has("processId") || Native.Pid(h) == a.Int("processId")) &&
            (!a.Has("windowTitle") || Native.Title(h).Contains(a.Text("windowTitle"), StringComparison.OrdinalIgnoreCase))).ToList();
        if (found.Count == 0) throw new InvalidOperationException("WINDOW_NOT_FOUND");
        if (found.Count > 1) throw new InvalidOperationException("AMBIGUOUS_WINDOW: use the HWND from list_windows.");
        return found[0];
    }
    internal void CheckTarget(nint hwnd, Arguments a, bool coordinates = false) {
        safety.Check();
        if (!Native.IsWindow(hwnd) || Native.IsHungAppWindow(hwnd)) throw new InvalidOperationException("TARGET_UNAVAILABLE");
        if (!observed.TryGetValue(hwnd, out var prior)) throw new InvalidOperationException("OBSERVATION_REQUIRED: inspect the window before acting.");
        if (prior.Pid != Native.Pid(hwnd) || DateTime.UtcNow - prior.At > TimeSpan.FromMinutes(2))
            throw new InvalidOperationException("STALE_OBSERVATION: re-observe the target window.");
        if (a.Has("observationId") && prior.Token != a.Text("observationId")) throw new InvalidOperationException("STALE_OBSERVATION: token no longer matches.");
        if (coordinates && prior.Bounds != Native.Bounds(hwnd)) throw new InvalidOperationException("WINDOW_MOVED: re-observe before using coordinates.");
    }
    internal void Activate(nint hwnd) {
        if (Native.IsIconic(hwnd)) Native.ShowWindow(hwnd, 9);
        Native.SetForegroundWindow(hwnd);
        // Cross-input-queue activation is asynchronous. Do not attach our input
        // queue to another application's potentially blocked UI thread.
        if (WaitForForeground(hwnd, 1200)) return;
        safety.Check();
        try { Native.Key(18, false); } finally { Native.Key(18, true); }
        Native.SetForegroundWindow(hwnd);
        if (!WaitForForeground(hwnd, 1200)) throw new InvalidOperationException(
            $"FOREGROUND_DENIED: target={(long)hwnd}, foreground={(long)Native.GetForegroundWindow()}; activate the target manually, then observe again.");
    }
    private bool WaitForForeground(nint hwnd, int timeoutMs) {
        for (var elapsed = 0; elapsed < timeoutMs; elapsed += 20) {
            safety.Check();
            if (!Native.IsWindow(hwnd)) throw new InvalidOperationException("TARGET_UNAVAILABLE");
            if (Native.GetForegroundWindow() == hwnd) return true;
            safety.Delay(20);
        }
        return Native.GetForegroundWindow() == hwnd;
    }
    internal void Foreground(nint hwnd, Arguments a) {
        if (a.Bool("activate") && Native.GetForegroundWindow() != hwnd) Activate(hwnd);
        AssertForeground(hwnd);
    }
    internal void AssertForeground(nint hwnd) {
        if (Native.GetForegroundWindow() != hwnd) throw new InvalidOperationException("FOCUS_CHANGED: re-observe and activate target before input.");
    }
    internal AutomationElement Root(nint hwnd) => AutomationElement.FromHandle(hwnd);
    private static nint Owner(AutomationElement element) {
        var current = element;
        for (var depth = 0; current is not null && depth < 64; depth++) {
            var handle = (nint)current.Current.NativeWindowHandle;
            if (handle != 0) return Native.GetAncestor(handle, 2);
            current = TreeWalker.RawViewWalker.GetParent(current);
        }
        return 0;
    }
    private string Remember(AutomationElement element, nint hwnd) {
        var runtime = string.Join(".", element.GetRuntimeId());
        var id = $"uia:{(long)hwnd}:{Native.Pid(hwnd)}:{runtime}";
        elements[id] = new(element, hwnd, Native.Pid(hwnd), DateTime.UtcNow); return id;
    }
    internal AutomationElement Element(string id, nint hwnd) {
        if (!elements.TryGetValue(id, out var item) || item.Window != hwnd || item.Pid != Native.Pid(hwnd) || DateTime.UtcNow - item.At > TimeSpan.FromMinutes(2))
            throw new InvalidOperationException("STALE_ELEMENT: query the target again.");
        return item.Element;
    }
    internal object Info(AutomationElement element, nint hwnd, int depth = 0) {
        var c = element.Current;
        var patterns = new List<string>();
        foreach (var p in new[] { InvokePattern.Pattern, ValuePattern.Pattern, TogglePattern.Pattern, SelectionItemPattern.Pattern, ExpandCollapsePattern.Pattern, TextPattern.Pattern })
            if (element.TryGetCurrentPattern(p, out _)) patterns.Add(p.ProgrammaticName.Replace("PatternIdentifiers.Pattern", ""));
        string? value = null;
        if (!c.IsPassword && element.TryGetCurrentPattern(ValuePattern.Pattern, out var vp)) value = ((ValuePattern)vp).Current.Value;
        return new { id = hwnd == 0 ? null : Remember(element, hwnd), depth, name = c.IsPassword ? "[password]" : c.Name, automationId = c.AutomationId,
            controlType = c.ControlType.ProgrammaticName.Replace("ControlType.", ""), className = c.ClassName,
            processId = c.ProcessId, boundingBox = Box(Rect(c.BoundingRectangle)), isEnabled = c.IsEnabled,
            isOffscreen = c.IsOffscreen, hasKeyboardFocus = c.HasKeyboardFocus, isPassword = c.IsPassword,
            value = value is null ? null : value[..Math.Min(value.Length, 2000)], patterns };
    }
    internal (List<object> Nodes, bool Truncated, string? Reason) Tree(nint hwnd, Arguments a, string? query = null) {
        Observe(hwnd);
        var root = a.Text("scope") == "desktop" ? AutomationElement.RootElement : Root(hwnd);
        var walker = a.Text("viewMode", "control") switch { "raw" => TreeWalker.RawViewWalker, "content" => TreeWalker.ContentViewWalker, _ => TreeWalker.ControlViewWalker };
        var nodes = new List<object>();
        var stack = new Stack<(AutomationElement Item, int Depth)>(); stack.Push((root, 0));
        var watch = Stopwatch.StartNew(); var count = 0; bool truncated = false; string? reason = null;
        var maxNodes = Math.Clamp(a.Int("maxNodes", 500), 1, 5000); var maxDepth = Math.Clamp(a.Int("maxDepth", 6), 0, 12);
        while (stack.Count > 0) {
            safety.Check();
            if (count >= maxNodes || watch.ElapsedMilliseconds > a.Int("treeTimeoutMs", 5000)) { truncated = true; reason = count >= maxNodes ? "maxNodes" : "timeBudget"; break; }
            var (e, depth) = stack.Pop(); count++;
            try {
                var c = e.Current;
                if (a.Bool("includeOffscreen") || !c.IsOffscreen) {
                    var type = c.ControlType.ProgrammaticName.Replace("ControlType.", "");
                    var match = query is null || (!c.IsPassword && (c.Name.Contains(query, StringComparison.OrdinalIgnoreCase) || c.AutomationId.Contains(query, StringComparison.OrdinalIgnoreCase) || c.ClassName.Contains(query, StringComparison.OrdinalIgnoreCase)));
                    if (match && (!a.Has("controlType") || type.Equals(a.Text("controlType"), StringComparison.OrdinalIgnoreCase))) {
                        var owner = a.Text("scope") == "desktop" ? Owner(e) : hwnd;
                        if (owner != 0 && !observed.ContainsKey(owner)) Observe(owner);
                        nodes.Add(Info(e, owner, depth));
                        if (query is not null && nodes.Count >= a.Int("maxResults", 25)) { truncated = true; reason = "maxResults"; break; }
                    }
                }
                var child = walker.GetFirstChild(e);
                if (depth >= maxDepth) { if (child is not null) { truncated = true; reason ??= "maxDepth"; } continue; }
                // Bound sibling enumeration as well as the outer walk.
                var children = new List<AutomationElement>();
                while (child is not null) {
                    safety.Check();
                    if (children.Count + count >= maxNodes || watch.ElapsedMilliseconds > a.Int("treeTimeoutMs", 5000)) { truncated = true; reason ??= "traversalBudget"; break; }
                    children.Add(child); child = walker.GetNextSibling(child);
                }
                for (var i = children.Count - 1; i >= 0; i--) stack.Push((children[i], depth + 1));
            } catch (ElementNotAvailableException) { truncated = true; reason ??= "elementUnavailable"; }
        }
        return (nodes, truncated, reason);
    }
    internal Drawing.Point Point(nint hwnd, Arguments a) {
        CheckTarget(hwnd, a, !a.Has("elementId"));
        Drawing.Point p;
        if (a.Has("elementId")) {
            var r = Rect(Element(a.Text("elementId"), hwnd).Current.BoundingRectangle);
            if (r.IsEmpty || r.Width <= 0 || r.Height <= 0) throw new InvalidOperationException("ELEMENT_NOT_VISIBLE");
            p = new(r.X + r.Width / 2, r.Y + r.Height / 2);
        } else {
            if (!a.Has("x") || !a.Has("y")) throw new InvalidOperationException("POINT_REQUIRED");
            p = new(a.Int("x"), a.Int("y"));
        }
        if (!Native.Bounds(hwnd).Contains(p)) throw new InvalidOperationException("POINT_OUTSIDE_TARGET");
        return p;
    }
    internal void CheckHit(nint hwnd, Drawing.Point p) {
        var hit = Native.WindowFromPoint(new Native.Point { X = p.X, Y = p.Y });
        if (Native.GetAncestor(hit, 2) != hwnd) throw new InvalidOperationException("TARGET_OCCLUDED: coordinate belongs to a different window.");
    }
    internal void Invalidate(nint hwnd) { observed.Remove(hwnd); }
}
