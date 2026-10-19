using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage.Streams;
using Forms = System.Windows.Forms;

namespace DesktopNative;
internal static class Capture
{
    internal sealed record Frame(byte[] Png, Rectangle Bounds, double Scale, int Width, int Height, string Source, bool OccludedPossible);
    internal static Frame Take(nint hwnd, Arguments a) {
        var desktop = a.Text("scope") == "desktop";
        var rect = desktop ? Forms.SystemInformation.VirtualScreen : Native.Bounds(hwnd);
        if (rect.Width <= 0 || rect.Height <= 0 || (long)rect.Width * rect.Height > 80_000_000) throw new InvalidOperationException("INVALID_CAPTURE_BOUNDS");
        using var bitmap = new Bitmap(rect.Width, rect.Height, PixelFormat.Format32bppArgb);
        var source = "screen"; var occluded = false;
        using (var g = Graphics.FromImage(bitmap)) {
            bool printed = false;
            if (!desktop && Native.GetForegroundWindow() != hwnd) {
                var dc = g.GetHdc();
                try { printed = Native.PrintWindow(hwnd, dc, 2); } finally { g.ReleaseHdc(dc); }
                source = "PrintWindow";
                if (printed) {
                    // Detect unusable black captures; do not silently claim a window image.
                    var nonBlack = false;
                    for (var y = 0; y < bitmap.Height && !nonBlack; y += Math.Max(1, bitmap.Height / 10))
                        for (var x = 0; x < bitmap.Width; x += Math.Max(1, bitmap.Width / 10))
                            if (bitmap.GetPixel(x, y).ToArgb() is not (0 or -16777216)) { nonBlack = true; break; }
                    printed = nonBlack;
                }
            }
            if (!printed) {
                var visible = Rectangle.Intersect(rect, Forms.SystemInformation.VirtualScreen);
                if (visible.IsEmpty) throw new InvalidOperationException("WINDOW_OFFSCREEN");
                g.Clear(Color.Black);
                g.CopyFromScreen(visible.Location, new Point(visible.X - rect.X, visible.Y - rect.Y), visible.Size);
                source = "screen"; occluded = !desktop;
            }
        }
        var maxWidth = a.Int("maxWidth", 1600);
        var scale = maxWidth > 0 && bitmap.Width > maxWidth ? (double)maxWidth / bitmap.Width : 1;
        var width = Math.Max(1, (int)Math.Round(bitmap.Width * scale)); var height = Math.Max(1, (int)Math.Round(bitmap.Height * scale));
        using var resized = new Bitmap(bitmap, width, height);
        using var stream = new MemoryStream(); resized.Save(stream, ImageFormat.Png);
        return new(stream.ToArray(), rect, scale, width, height, source, occluded);
    }
    internal static object Image(Frame f) => new { mimeType = "image/png", base64 = Convert.ToBase64String(f.Png), bounds = WindowsUi.Box(f.Bounds), imageScale = f.Scale,
        width = f.Width, height = f.Height, source = f.Source, occludedPossible = f.OccludedPossible };
    internal static object Ocr(Frame frame, Arguments args) => Recognize(frame, args).GetAwaiter().GetResult();
    private static async Task<object> Recognize(Frame frame, Arguments args) {
        var engine = OcrEngine.TryCreateFromUserProfileLanguages() ?? throw new InvalidOperationException("OCR_UNAVAILABLE: install a Windows OCR language pack.");
        using var stream = new InMemoryRandomAccessStream();
        using (var writer = new DataWriter(stream)) { writer.WriteBytes(frame.Png); await writer.StoreAsync(); writer.DetachStream(); }
        stream.Seek(0);
        var decoder = await BitmapDecoder.CreateAsync(stream);
        using var bitmap = await decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);
        var result = await engine.RecognizeAsync(bitmap);
        var lines = new List<object>(); var matched = new List<object>();
        var query = Compact(args.Text("query"));
        foreach (var line in result.Lines) {
            var words = new List<object>();
            foreach (var word in line.Words) {
                var r = word.BoundingRect;
                var box = new Rectangle(frame.Bounds.X + (int)(r.X / frame.Scale), frame.Bounds.Y + (int)(r.Y / frame.Scale), Math.Max(1, (int)(r.Width / frame.Scale)), Math.Max(1, (int)(r.Height / frame.Scale)));
                words.Add(new { text = word.Text, boundingBox = WindowsUi.Box(box) });
            }
            lines.Add(new { text = line.Text, words });
            // Match whole visible lines too, so segmented Chinese queries still work.
            if (query.Length > 0 && Compact(line.Text).Contains(query, StringComparison.Ordinal)) {
                var boxes = line.Words.Select(w => w.BoundingRect).ToList();
                if (boxes.Count > 0) {
                    var box = new Rectangle(frame.Bounds.X + (int)(boxes.Min(b => b.Left) / frame.Scale), frame.Bounds.Y + (int)(boxes.Min(b => b.Top) / frame.Scale),
                        (int)((boxes.Max(b => b.Right) - boxes.Min(b => b.Left)) / frame.Scale), (int)((boxes.Max(b => b.Bottom) - boxes.Min(b => b.Top)) / frame.Scale));
                    matched.Add(new { text = line.Text, boundingBox = WindowsUi.Box(box), x = box.X + box.Width / 2, y = box.Y + box.Height / 2 });
                }
            }
        }
        return new { text = result.Text, lines, matched, source = "Windows.Media.Ocr", imageScale = frame.Scale, bounds = WindowsUi.Box(frame.Bounds), occludedPossible = frame.OccludedPossible };
    }
    private static string Compact(string value) => string.Concat(value.Where(c => !char.IsWhiteSpace(c))).ToLowerInvariant();
}
