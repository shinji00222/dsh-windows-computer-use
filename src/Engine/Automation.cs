using FlaUI.UIA3;
using FlaUI.Core.Patterns;
using Element = FlaUI.Core.AutomationElements.AutomationElement;
using Kind = FlaUI.Core.Definitions.ControlType;

namespace DesktopNative.Automation;

// Small UIA3 boundary. Keep protocol and safety logic independent of the provider.
internal sealed record ControlType(Kind Kind) {
    internal static readonly ControlType Edit = new(Kind.Edit);
    internal int Id => (int)Kind;
    internal string ProgrammaticName => "ControlType." + Kind;
}
internal sealed record AutomationPattern(string Name) {
    internal string ProgrammaticName => Name;
}
internal sealed class AutomationElement(Element element) {
    internal static readonly UIA3Automation Provider = new();
    internal Element Native => element;
    internal AutomationElement Current => this;
    internal string Name => element.Properties.Name.ValueOrDefault ?? "";
    internal string AutomationId => element.Properties.AutomationId.ValueOrDefault ?? "";
    internal string ClassName => element.Properties.ClassName.ValueOrDefault ?? "";
    internal int ProcessId => element.Properties.ProcessId.Value;
    internal int NativeWindowHandle => (int)element.Properties.NativeWindowHandle.ValueOrDefault;
    internal ControlType ControlType => new(element.ControlType);
    internal bool IsPassword => element.Properties.IsPassword.ValueOrDefault;
    internal bool IsEnabled => element.IsEnabled;
    internal bool IsOffscreen => element.Properties.IsOffscreen.ValueOrDefault;
    internal bool HasKeyboardFocus => element.Properties.HasKeyboardFocus.ValueOrDefault;
    internal System.Windows.Rect BoundingRectangle { get { var b=element.BoundingRectangle; return new(b.X,b.Y,b.Width,b.Height); } }
    internal int[] GetRuntimeId() => element.Properties.RuntimeId.Value;
    internal void SetFocus() => element.Focus();
    internal static AutomationElement RootElement => new(Provider.GetDesktop());
    internal static AutomationElement FocusedElement => new(Provider.FocusedElement());
    internal static AutomationElement FromHandle(nint hwnd) => new(Provider.FromHandle(hwnd));
    internal static AutomationElement FromPoint(System.Windows.Point p) => new(Provider.FromPoint(new((int)p.X,(int)p.Y)));
    internal AutomationElement[] FindEdits() => element.FindAllDescendants(Provider.ConditionFactory.ByControlType(Kind.Edit)).Select(e=>new AutomationElement(e)).ToArray();
    internal object GetCurrentPattern(AutomationPattern pattern) => TryGetCurrentPattern(pattern, out var value) ? value : throw new InvalidOperationException("PATTERN_UNAVAILABLE");
    internal bool TryGetCurrentPattern(AutomationPattern pattern, out object value) {
        value = null!;
        switch(pattern.Name) {
            case "Value": if(element.Patterns.Value.TryGetPattern(out var v)) value=new ValuePattern(v); break;
            case "Invoke": if(element.Patterns.Invoke.TryGetPattern(out var i)) value=new InvokePattern(i); break;
            case "Toggle": if(element.Patterns.Toggle.TryGetPattern(out var t)) value=new TogglePattern(t); break;
            case "SelectionItem": if(element.Patterns.SelectionItem.TryGetPattern(out var s)) value=new SelectionItemPattern(s); break;
            case "ExpandCollapse": if(element.Patterns.ExpandCollapse.TryGetPattern(out var x)) value=new ExpandCollapsePattern(x); break;
            case "Text": if(element.Patterns.Text.IsSupported) value=TextPattern.Pattern; break;
        }
        return value is not null;
    }
}
internal sealed class TreeWalker(FlaUI.Core.ITreeWalker walker) {
    internal static TreeWalker RawViewWalker => new(AutomationElement.Provider.TreeWalkerFactory.GetRawViewWalker());
    internal static TreeWalker ControlViewWalker => new(AutomationElement.Provider.TreeWalkerFactory.GetControlViewWalker());
    internal static TreeWalker ContentViewWalker => new(AutomationElement.Provider.TreeWalkerFactory.GetContentViewWalker());
    private static AutomationElement? Wrap(Element? e) => e is null ? null : new(e);
    internal AutomationElement? GetParent(AutomationElement e) => Wrap(walker.GetParent(e.Native));
    internal AutomationElement? GetFirstChild(AutomationElement e) => Wrap(walker.GetFirstChild(e.Native));
    internal AutomationElement? GetNextSibling(AutomationElement e) => Wrap(walker.GetNextSibling(e.Native));
}
internal sealed class ValuePattern(IValuePattern pattern) {
    internal static readonly AutomationPattern Pattern = new("Value");
    internal ValuePattern Current => this;
    internal string Value => pattern.Value.Value;
    internal bool IsReadOnly => pattern.IsReadOnly.Value;
    internal void SetValue(string value) => pattern.SetValue(value);
}
internal sealed class InvokePattern(IInvokePattern pattern) { internal static readonly AutomationPattern Pattern=new("Invoke"); internal void Invoke()=>pattern.Invoke(); }
internal sealed class TogglePattern(ITogglePattern pattern) { internal static readonly AutomationPattern Pattern=new("Toggle"); internal void Toggle()=>pattern.Toggle(); }
internal sealed class SelectionItemPattern(ISelectionItemPattern pattern) { internal static readonly AutomationPattern Pattern=new("SelectionItem"); internal void Select()=>pattern.Select(); }
internal sealed class ExpandCollapsePattern(IExpandCollapsePattern pattern) { internal static readonly AutomationPattern Pattern=new("ExpandCollapse"); internal void Expand()=>pattern.Expand(); }
internal static class TextPattern { internal static readonly AutomationPattern Pattern=new("Text"); }

