using DesktopNative.Automation;
using ElementNotAvailableException = System.Windows.Automation.ElementNotAvailableException;
using Forms = System.Windows.Forms;
namespace DesktopNative;
internal sealed class InputActions(WindowsUi ui, Safety safety)
{
    private static (uint Down, uint Up) Button(string button) => button switch { "right" => (8, 16), "middle" => (32, 64), _ => (2, 4) };
    private void Move(nint hwnd, Arguments a, System.Drawing.Point point) {
        ui.Foreground(hwnd, a); ui.CheckHit(hwnd, point); safety.Check();
        if (!Native.SetCursorPos(point.X, point.Y)) throw new InvalidOperationException("POINTER_MOVE_REJECTED");
    }
    internal object Pointer(string action, nint hwnd, Arguments a) {
        if (a.Text("dispatch") == "background") throw new InvalidOperationException("UNSUPPORTED: background input is not supported by v1.");
        var p = ui.Point(hwnd, a); Move(hwnd, a, p);
        if (action == "move") return new { verification = "sent", x = p.X, y = p.Y };
        if (action == "scroll") {
            safety.Check();
            if (a.Int("deltaY", 480) != 0) Native.Mouse(0x800, -a.Int("deltaY", 480));
            if (a.Int("deltaX") != 0) Native.Mouse(0x1000, a.Int("deltaX"));
        } else {
            var flags = Button(a.Text("button", "left"));
            safety.Check(); ui.AssertForeground(hwnd);
            Native.GetCursorPos(out var cursor);
            if (cursor.X != p.X || cursor.Y != p.Y) throw new InvalidOperationException("POINTER_CHANGED: observe target before retrying.");
            try {
                if (action == "double_click") Native.DoubleClick(flags.Down, flags.Up);
                else { Native.Mouse(flags.Down); safety.Delay(30); }
            } finally { Native.Mouse(flags.Up); }
        }
        return new { verification = "sent", note = "Observe the target again to verify the effect." };
    }
    internal object Drag(nint hwnd, Arguments a) {
        ui.CheckTarget(hwnd, a, true);
        var points = a.Array("path").Select(p => new System.Drawing.Point(p.GetProperty("x").GetInt32(), p.GetProperty("y").GetInt32())).ToArray();
        if (points.Length < 2 || points.Length > 1000) throw new InvalidOperationException("INVALID_DRAG_PATH");
        foreach (var p in points) if (!Native.Bounds(hwnd).Contains(p)) throw new InvalidOperationException("POINT_OUTSIDE_TARGET");
        Move(hwnd, a, points[0]); var flags = Button(a.Text("button", "left"));
        try {
            Native.Mouse(flags.Down);
            foreach (var p in points.Skip(1)) { safety.Delay(30); ui.AssertForeground(hwnd); ui.CheckHit(hwnd, p); if (!Native.SetCursorPos(p.X, p.Y)) throw new InvalidOperationException("POINTER_MOVE_REJECTED"); }
        } finally { Native.Mouse(flags.Up); }
        return new { verification = "sent" };
    }
    internal object Type(nint hwnd, Arguments a) {
        ui.CheckTarget(hwnd, a); ui.Foreground(hwnd, a);
        if (a.Text("method") == "background") throw new InvalidOperationException("UNSUPPORTED: background typing is not supported by v1.");
        if (a.Text("focusMode") == "main") {
            var edits = ui.Root(hwnd).FindEdits();
            if (edits.Length != 1) throw new InvalidOperationException("AMBIGUOUS_TEXT_CONTROL: click or focus a specific element first.");
            edits[0].SetFocus();
        }
        var text = a.Text("text");
        if (text.Length > 100_000) throw new InvalidOperationException("TEXT_TOO_LONG");
        if (a.Text("method", "clipboard") == "sendinput") {
            foreach (var ch in text) {
                safety.Check(); ui.AssertForeground(hwnd);
                if (ch == '\r') continue;
                var key = ch == '\n' ? (ushort)13 : ch == '\t' ? (ushort)9 : ch;
                var unicode = ch is not ('\n' or '\t');
                try { Native.Key(key, false, unicode); } finally { Native.Key(key, true, unicode); }
            }
        } else {
            OnClipboardThread(() => {
            var old = a.Bool("restoreClipboard", true) ? Forms.Clipboard.GetDataObject() : null;
            try {
                if (text.Length == 0) return;
                Forms.Clipboard.SetText(text); Chord(hwnd, a, ["ctrl", "v"]); safety.Delay(200);
            } finally {
                if (a.Bool("restoreClipboard", true)) { if (old is null) Forms.Clipboard.Clear(); else Forms.Clipboard.SetDataObject(old, true); }
            }
            });
        }
        string? value = null;
        try {
            var focused = AutomationElement.FocusedElement;
            if (focused.Current.ProcessId == Native.Pid(hwnd) && !focused.Current.IsPassword && focused.TryGetCurrentPattern(ValuePattern.Pattern, out var pattern))
                value = ((ValuePattern)pattern).Current.Value;
        } catch (ElementNotAvailableException) { }
        return new { verification = "sent", characters = text.Length, verifyValue = value is null ? null : value[..Math.Min(value.Length, 2000)] };
    }
    internal object Keys(nint hwnd, Arguments a) {
        if (a.Text("dispatch") == "background") throw new InvalidOperationException("UNSUPPORTED: background chords are not supported by v1.");
        ui.CheckTarget(hwnd, a); Chord(hwnd, a, a.Array("keys").Select(v => v.GetString()!).ToArray()); return new { verification = "sent" };
    }
    private static void OnClipboardThread(Action action) {
        Exception? failure = null;
        var thread = new Thread(() => { try { action(); } catch (Exception e) { failure = e; } });
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start(); thread.Join();
        if (failure is not null) System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(failure).Throw();
    }
    private void Chord(nint hwnd, Arguments a, string[] keys) {
        ui.Foreground(hwnd, a); safety.Check();
        var codes = ValidateChord(keys);
        var held = new List<ushort>();
        try { foreach (var code in codes) { safety.Check(); Native.Key(code, false); held.Add(code); } safety.Delay(30); }
        finally { foreach (var code in held.AsEnumerable().Reverse()) Native.Key(code, true); }
    }
    internal static ushort[] ValidateChord(string[] keys) {
        var codes = keys.Select(KeyCode).ToArray();
        if (codes.Count(c => c is not (16 or 17 or 18)) != 1 || codes.Distinct().Count() != codes.Length) throw new InvalidOperationException("INVALID_KEY_CHORD");
        return codes;
    }
    private static ushort KeyCode(string key) {
        if (key.Equals("win", StringComparison.OrdinalIgnoreCase) || key.Equals("windows", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("WINDOWS_KEY_UNSUPPORTED");
        return key.ToLowerInvariant() switch {
            "ctrl" or "control" => 17, "alt" or "option" => 18, "shift" => 16, "enter" or "return" => 13,
            "tab" => 9, "esc" or "escape" => 27, "space" => 32, "backspace" => 8, "delete" => 46,
            "home" => 36, "end" => 35, "pageup" => 33, "pagedown" => 34, "left" => 37, "up" => 38, "right" => 39, "down" => 40,
            _ when key.Length == 1 && char.IsAsciiLetterOrDigit(key[0]) => char.ToUpperInvariant(key[0]),
            _ when key.StartsWith('F') || key.StartsWith('f') => ParseFunction(key),
            _ => throw new InvalidOperationException("UNSUPPORTED_KEY")
        };
    }
    private static ushort ParseFunction(string key) => int.TryParse(key[1..], out var n) && n is >= 1 and <= 24 ? (ushort)(111 + n) : throw new InvalidOperationException("UNSUPPORTED_KEY");
    internal object ElementAction(string action, nint hwnd, Arguments a) {
        ui.CheckTarget(hwnd, a); var element = ui.Element(a.Text("elementId"), hwnd);
        if (action == "focus") { ui.Foreground(hwnd, a); element.SetFocus(); return new { verification = "sent" }; }
        if (action == "set_value") {
            if (element.Current.IsPassword) throw new InvalidOperationException("PASSWORD_CONTROL: use foreground typing; value readback is disabled.");
            if (!element.TryGetCurrentPattern(ValuePattern.Pattern, out var vp)) throw new InvalidOperationException("VALUE_PATTERN_UNAVAILABLE: focus and type explicitly.");
            var pattern = (ValuePattern)vp; pattern.SetValue(a.Text("value"));
            return new { verification = pattern.Current.Value == a.Text("value") ? "observed" : "unconfirmed", verifyValue = pattern.Current.Value };
        }
        if (element.TryGetCurrentPattern(InvokePattern.Pattern, out var invoke)) ((InvokePattern)invoke).Invoke();
        else if (element.TryGetCurrentPattern(TogglePattern.Pattern, out var toggle)) ((TogglePattern)toggle).Toggle();
        else if (element.TryGetCurrentPattern(SelectionItemPattern.Pattern, out var selection)) ((SelectionItemPattern)selection).Select();
        else if (element.TryGetCurrentPattern(ExpandCollapsePattern.Pattern, out var expand)) ((ExpandCollapsePattern)expand).Expand();
        else throw new InvalidOperationException("INVOKE_PATTERN_UNAVAILABLE: use a foreground click explicitly.");
        safety.Delay(60);
        return new { verification = "sent" };
    }
}

