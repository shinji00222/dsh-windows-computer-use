using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using Forms = System.Windows.Forms;
namespace DesktopNative;
internal sealed class Safety : IDisposable
{
    private readonly ConcurrentDictionary<string, byte> blocked = new();
    private readonly Mutex desktop = new(false, @"Local\DSH-Desktop-Native-Desktop-v1");
    private readonly ManualResetEventSlim ready = new();
    private readonly Native.HookProc callback;
    private readonly Thread thread;
    private volatile string turn = "standalone";
    private nint hook;
    private Forms.Form? banner;
    private Exception? startError;
    private int escapeEvents;
    internal int EscapeEvents => Volatile.Read(ref escapeEvents);
    internal bool ListenerAlive => thread.IsAlive && hook != 0 && startError is null;
    internal Safety() {
        callback = (code, wparam, lparam) => {
            if (code >= 0 && (wparam == 0x100 || wparam == 0x104) && Marshal.ReadInt32(lparam) == 27) {
                Interlocked.Increment(ref escapeEvents); Stop();
            }
            return Native.CallNextHookEx(hook, code, wparam, lparam);
        };
        thread = new Thread(() => {
            try {
                banner = new Banner { Text = "DSH Native", TopMost = true, ShowInTaskbar = false,
                    FormBorderStyle = Forms.FormBorderStyle.None, BackColor = System.Drawing.Color.FromArgb(24, 52, 77),
                    ForeColor = System.Drawing.Color.White, Width = 350, Height = 36, StartPosition = Forms.FormStartPosition.Manual };
                banner.Controls.Add(new Forms.Label { Text = "DSH 正在控制电脑 · Esc 停止", Dock = Forms.DockStyle.Fill, TextAlign = System.Drawing.ContentAlignment.MiddleCenter });
                _ = banner.Handle;
                hook = Native.SetWindowsHookEx(13, callback, Native.GetModuleHandle(null), 0);
                if (hook == 0) throw new InvalidOperationException("STOP_LISTENER_UNAVAILABLE");
                // Readiness means the hook thread is actually pumping messages.
                banner.BeginInvoke(() => ready.Set()); Forms.Application.Run();
            } catch (Exception e) { startError = e; ready.Set(); }
            finally { if (hook != 0) Native.UnhookWindowsHookEx(hook); }
        }) { IsBackground = true, Name = "Desktop emergency stop" };
        thread.SetApartmentState(ApartmentState.STA); thread.Start();
        if (!ready.Wait(10000)) throw new InvalidOperationException("STOP_LISTENER_TIMEOUT");
        if (startError is not null) throw startError;
    }
    internal void SetTurn(string key) => turn = key;
    internal void Stop() => blocked[turn] = 0;
    internal void Resume(string key) => blocked.TryRemove(key, out _);
    internal void Check() {
        if (!thread.IsAlive) throw new InvalidOperationException("STOP_LISTENER_UNAVAILABLE");
        if (blocked.ContainsKey(turn)) throw new OperationCanceledException("STOPPED_BY_USER: Do not retry this turn; wait for a new user request.");
    }
    internal IDisposable Enter(string key, bool indicator) {
        SetTurn(key); Check();
        bool owned;
        try { owned = desktop.WaitOne(0); } catch (AbandonedMutexException) { owned = true; }
        if (!owned) throw new InvalidOperationException("DESKTOP_BUSY: another native engine owns the desktop.");
        if (indicator) banner!.BeginInvoke(() => {
            var screen = Forms.Screen.PrimaryScreen!.WorkingArea;
            banner.Location = new System.Drawing.Point(screen.Right - banner.Width - 12, screen.Top + 12); banner.Show();
        });
        return new Release(() => { banner?.BeginInvoke(() => banner.Hide()); desktop.ReleaseMutex(); });
    }
    internal void Delay(int milliseconds) {
        for (var elapsed = 0; elapsed < milliseconds; elapsed += 20) { Check(); Thread.Sleep(Math.Min(20, milliseconds - elapsed)); }
        Check();
    }
    public void Dispose() {
        if (banner is not null && thread.IsAlive) banner.BeginInvoke(() => Forms.Application.ExitThread());
        thread.Join(1500); desktop.Dispose(); ready.Dispose();
    }
    private sealed class Release(Action action) : IDisposable { public void Dispose() => action(); }
    private sealed class Banner : Forms.Form {
        protected override bool ShowWithoutActivation => true;
        protected override Forms.CreateParams CreateParams { get { var p = base.CreateParams; p.ExStyle |= 0x08000000 | 0x80 | 0x20; return p; } }
    }
}
