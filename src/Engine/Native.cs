using System.Runtime.InteropServices;
namespace DesktopNative;
internal static class Native
{
    [StructLayout(LayoutKind.Sequential)] internal struct Point { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] internal struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] internal struct Input { public uint Type; public InputData Data; }
    [StructLayout(LayoutKind.Explicit)] internal struct InputData {
        [FieldOffset(0)] public MouseInput Mouse;
        [FieldOffset(0)] public KeyboardInput Keyboard;
    }
    [StructLayout(LayoutKind.Sequential)] internal struct MouseInput { public int X, Y; public uint Data, Flags, Time; public nuint Extra; }
    [StructLayout(LayoutKind.Sequential)] internal struct KeyboardInput { public ushort Key, Scan; public uint Flags, Time; public nuint Extra; }
    internal delegate bool EnumCallback(nint hwnd, nint data);
    internal delegate nint HookProc(int code, nint wparam, nint lparam);
    [DllImport("user32.dll")] internal static extern nint GetForegroundWindow();
    [DllImport("user32.dll")] internal static extern bool EnumWindows(EnumCallback callback, nint data);
    [DllImport("user32.dll")] internal static extern bool IsWindow(nint hwnd);
    [DllImport("user32.dll")] internal static extern bool IsWindowVisible(nint hwnd);
    [DllImport("user32.dll")] internal static extern bool IsIconic(nint hwnd);
    [DllImport("user32.dll")] internal static extern bool IsHungAppWindow(nint hwnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] internal static extern int GetWindowText(nint hwnd, System.Text.StringBuilder text, int max);
    [DllImport("user32.dll")] internal static extern uint GetWindowThreadProcessId(nint hwnd, out uint pid);
    [DllImport("user32.dll")] internal static extern bool GetWindowRect(nint hwnd, out Rect rect);
    [DllImport("user32.dll")] internal static extern bool SetForegroundWindow(nint hwnd);
    [DllImport("user32.dll")] internal static extern bool AttachThreadInput(uint source, uint target, bool attach);
    [DllImport("kernel32.dll")] internal static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] internal static extern bool ShowWindow(nint hwnd, int command);
    [DllImport("user32.dll", SetLastError = true)] internal static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] internal static extern bool GetCursorPos(out Point point);
    [DllImport("user32.dll")] internal static extern nint WindowFromPoint(Point point);
    [DllImport("user32.dll")] internal static extern nint GetAncestor(nint hwnd, uint flags);
    [DllImport("user32.dll", SetLastError = true)] internal static extern uint SendInput(uint count, Input[] inputs, int size);
    [DllImport("user32.dll", SetLastError = true)] internal static extern bool PostMessage(nint hwnd, uint message, nint wparam, nint lparam);
    [DllImport("user32.dll")] internal static extern bool SetWindowPos(nint hwnd, nint after, int x, int y, int width, int height, uint flags);
    [DllImport("user32.dll")] internal static extern bool PrintWindow(nint hwnd, nint dc, uint flags);
    [DllImport("user32.dll", SetLastError = true)] internal static extern nint SetWindowsHookEx(int id, HookProc callback, nint module, uint thread);
    [DllImport("user32.dll")] internal static extern bool UnhookWindowsHookEx(nint hook);
    [DllImport("user32.dll")] internal static extern nint CallNextHookEx(nint hook, int code, nint wparam, nint lparam);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] internal static extern nint GetModuleHandle(string? module);
    internal static string Title(nint hwnd) { var s = new System.Text.StringBuilder(2048); GetWindowText(hwnd, s, s.Capacity); return s.ToString(); }
    internal static int Pid(nint hwnd) { GetWindowThreadProcessId(hwnd, out var id); return (int)id; }
    internal static System.Drawing.Rectangle Bounds(nint hwnd) {
        if (!GetWindowRect(hwnd, out var r)) throw new InvalidOperationException("WINDOW_GONE");
        return System.Drawing.Rectangle.FromLTRB(r.Left, r.Top, r.Right, r.Bottom);
    }
    internal static void Key(ushort key, bool up, bool unicode = false) => Send(new Input { Type = 1, Data = new InputData { Keyboard = new KeyboardInput {
        Key = unicode ? (ushort)0 : key, Scan = unicode ? key : (ushort)0, Flags = (up ? 2u : 0u) | (unicode ? 4u : 0u) } } });
    internal static void Mouse(uint flags, int data = 0) => Send(new Input { Type = 0, Data = new InputData { Mouse = new MouseInput { Flags = flags, Data = unchecked((uint)data) } } });
    private static void Send(Input input) {
        if (SendInput(1, [input], Marshal.SizeOf<Input>()) != 1) throw new InvalidOperationException("INPUT_REJECTED: Windows blocked input (check target integrity/UAC).");
    }
}
