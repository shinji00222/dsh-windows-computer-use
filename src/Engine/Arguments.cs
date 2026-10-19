using System.Text.Json;
namespace DesktopNative;
internal sealed class Arguments(JsonElement value)
{
    internal bool Has(string key) => value.TryGetProperty(key, out _);
    internal string Text(string key, string fallback = "") => value.TryGetProperty(key, out var v) ? v.GetString() ?? fallback : fallback;
    internal int Int(string key, int fallback = 0) => value.TryGetProperty(key, out var v) ? v.GetInt32() : fallback;
    internal long Long(string key, long fallback = 0) => value.TryGetProperty(key, out var v) ? v.GetInt64() : fallback;
    internal bool Bool(string key, bool fallback = false) => value.TryGetProperty(key, out var v) ? v.GetBoolean() : fallback;
    internal JsonElement.ArrayEnumerator Array(string key) => value.GetProperty(key).EnumerateArray();
    internal bool HasTarget => Has("nativeWindowHandle") || Has("processId") || Has("windowTitle");
}
