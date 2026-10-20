using Forms = System.Windows.Forms;
namespace DesktopNative;
internal static class Fixture
{
    internal static void Run() {
        var form = new Forms.Form { Text = "DSH Native Test Fixture", Width = 680, Height = 650, StartPosition = Forms.FormStartPosition.CenterScreen };
        var edit = new Forms.TextBox { Name = "testInput", Multiline = true, Left = 24, Top = 65, Width = 600, Height = 180, Font = new System.Drawing.Font("Microsoft YaHei UI", 16) };
        var label = new Forms.Label { Name = "testStatus", Text = "等待测试 READY", Left = 24, Top = 270, Width = 600, Height = 50, Font = new System.Drawing.Font("Microsoft YaHei UI", 18) };
        var button = new Forms.Button { Name = "testButton", Text = "确认 Verify", Left = 24, Top = 20, Width = 170, Height = 36 };
        button.Click += (_, _) => label.Text = "已确认 VERIFIED";
        var stop = new Forms.Button { Name = "testStop", Text = "发送 Esc", Left = 220, Top = 20, Width = 120, Height = 36 };
        // Deliberately asynchronous: UIA Invoke returning does not prove the effect.
        var escapeTimer = new Forms.Timer { Interval = 450 };
        escapeTimer.Tick += (_, _) => { escapeTimer.Stop(); try { Native.Key(27, false); } finally { Native.Key(27, true); } };
        stop.Click += (_, _) => escapeTimer.Start();
        form.FormClosed += (_, _) => escapeTimer.Dispose();
        var password = new Forms.TextBox { Name = "testPassword", Text = "fixture-secret-value", UseSystemPasswordChar = true, Left = 24, Top = 340, Width = 260 };
        var pointerStatus = new Forms.Label { Name = "pointerStatus", Text = "POINTER READY", Left = 24, Top = 480, Width = 580, Height = 36 };
        System.Drawing.Point start = default;
        edit.MouseDown += (_, e) => start = e.Location;
        edit.MouseUp += (_, e) => { if (Math.Abs(start.X - e.X) + Math.Abs(start.Y - e.Y) > 10) pointerStatus.Text = "DRAGGED"; };
        edit.MouseDoubleClick += (_, _) => pointerStatus.Text = "DOUBLE_CLICKED";
        edit.MouseWheel += (_, _) => pointerStatus.Text = "SCROLLED";
        var clipboardBaseline = Forms.Clipboard.ContainsText() ? Forms.Clipboard.GetText() : null;
        var clipboardCheck = new Forms.Button { Name = "clipboardCheck", Text = "检查剪贴板", Left = 24, Top = 530, Width = 170, Height = 36 };
        clipboardCheck.Click += (_, _) => pointerStatus.Text = clipboardBaseline == (Forms.Clipboard.ContainsText() ? Forms.Clipboard.GetText() : null) ? "CLIPBOARD_RESTORED" : "CLIPBOARD_CHANGED";
        var ocrLabel = new Forms.Label { Text = "NATIVE TEST 12345", Left = 24, Top = 400, Width = 600, Height = 60, Font = new System.Drawing.Font("Arial", 18) };
        var change = new Forms.Button { Name = "batchChange", Text = "Change page", Left = 360, Top = 20, Width = 110, Height = 36 };
        change.Click += (_, _) => form.Text = "DSH Native Changed Page";
        var popup = new Forms.Button { Name = "batchPopup", Text = "Popup", Left = 480, Top = 20, Width = 110, Height = 36 };
        popup.Click += (_, _) => new Forms.Form { Text = "DSH Batch Owned Popup", Width = 300, Height = 200 }.Show(form);
        var layout = new Forms.Button { Name = "batchLayout", Text = "Change controls", Left = 220, Top = 530, Width = 170, Height = 36 };
        layout.Click += (_, _) => label.Text = "CONTROL LAYOUT CHANGED";
        form.Controls.AddRange([edit, label, button, stop, password, ocrLabel, pointerStatus, clipboardCheck, change, popup, layout]);
        form.Shown += (_, _) => {
            // Child process console hiding can also affect its initial ShowWindow.
            // Explicitly show only this owned fixture, then report real visibility.
            Native.ShowWindow(form.Handle, 5);
            Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(new { ready = true, hwnd = (long)form.Handle, processId = Environment.ProcessId, visible = Native.IsWindowVisible(form.Handle) }));
            // Test-only control channel: emulate an application briefly busy on its UI thread.
            _ = Task.Run(() => {
                while (Console.ReadLine() is { } command) {
                    if (command == "stall") form.BeginInvoke(() => {
                        Console.WriteLine("{\"stalled\":true}");
                        Thread.Sleep(900);
                    });
                }
            });
        };
        Forms.Application.Run(form);
    }
}
