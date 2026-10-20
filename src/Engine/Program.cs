using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using Forms = System.Windows.Forms;
namespace DesktopNative;
internal static class Program
{
    [STAThread]
    private static void Main(string[] args) {
        Console.InputEncoding = Encoding.UTF8; Console.OutputEncoding = new UTF8Encoding(false);
        Forms.Application.SetHighDpiMode(Forms.HighDpiMode.PerMonitorV2);
        if (args.Contains("--fixture")) { Fixture.Run(); return; }
        using var safety = new Safety(); var engine = new Engine(safety);
        using var queue = new BlockingCollection<JsonElement>(256);
        var outputLock = new object();
        void Reply(object data) { lock (outputLock) Console.WriteLine(JsonSerializer.Serialize(data)); }
        var reader = Task.Run(() => {
            try {
                while (Console.ReadLine() is { } line) {
                    if (line.Length > 2_000_000) { Reply(new { id = -1, ok = false, error = "REQUEST_TOO_LARGE" }); continue; }
                    try {
                        var request = JsonSerializer.Deserialize<JsonElement>(line);
                        if (request.GetProperty("action").GetString() == "cancel") { safety.Stop(); Reply(new { id = request.GetProperty("id").GetInt32(), ok = true, result = new { stopped = true } }); }
                        else if (!queue.TryAdd(request)) Reply(new { id = request.GetProperty("id").GetInt32(), ok = false, error = "QUEUE_FULL" });
                    } catch (Exception e) when (e is JsonException or InvalidOperationException or KeyNotFoundException) { Reply(new { id = -1, ok = false, error = "INVALID_REQUEST" }); }
                }
            } finally { queue.CompleteAdding(); }
        });
        Reply(new { ready = true, version = "0.1.0-preview.4" });
        foreach (var request in queue.GetConsumingEnumerable()) {
            var id = request.GetProperty("id").GetInt32();
            try {
                var action = request.GetProperty("action").GetString()!;
                var a = new Arguments(request.TryGetProperty("args", out var av) ? av : JsonSerializer.SerializeToElement(new { }));
                var turn = request.TryGetProperty("turnId", out var tv) ? tv.GetString() ?? "standalone" : "standalone";
                var indicator = !request.TryGetProperty("indicator", out var iv) || iv.GetBoolean();
                var result = engine.Execute(action, a, turn, indicator);
                if (action is not ("health" or "resume" or "run_batch" or "run_text_batch")) safety.Check();
                Reply(new { id, ok = true, result });
            } catch (Exception e) { Reply(new { id, ok = false, error = e.Message, errorType = e.GetType().Name }); }
        }
        reader.GetAwaiter().GetResult();
    }
}
