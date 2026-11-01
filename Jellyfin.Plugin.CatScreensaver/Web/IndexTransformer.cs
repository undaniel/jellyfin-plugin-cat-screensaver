namespace Jellyfin.Plugin.CatScreensaver.Web;

/// <summary>
/// Shape File Transformation sends to the callback: <c>{ "contents": "..." }</c>.
/// The property name matches the JSON payload case-insensitively.
/// </summary>
public sealed class TransformationContents
{
    /// <summary>
    /// Gets or sets the current contents of the served file.
    /// </summary>
    public string Contents { get; set; } = string.Empty;
}

/// <summary>
/// Injects the screensaver script into jellyfin-web's index.html.
/// </summary>
public static class IndexTransformer
{
    /// <summary>
    /// Marker used for idempotence.
    /// </summary>
    public const string Marker = "cat-screensaver.js";

    /// <summary>
    /// Exact File Transformation key for jellyfin-web's index. Other plugins
    /// already register this exact key, and File Transformation only runs the
    /// exact pipeline when one exists, so a regex would never be reached.
    /// </summary>
    public const string FileNamePattern = "index.html";

    /// <summary>
    /// Returns the HTML with the script tag added before the closing body tag.
    /// The relative URL works both at the root and with a base path such as /jellyfin,
    /// because jellyfin-web serves index.html from /web/.
    /// </summary>
    /// <param name="payload">File Transformation payload.</param>
    /// <returns>Transformed HTML.</returns>
    public static string Transform(TransformationContents? payload)
    {
        var html = payload?.Contents;
        if (string.IsNullOrEmpty(html))
        {
            return html ?? string.Empty;
        }

        if (html.Contains(Marker, StringComparison.OrdinalIgnoreCase))
        {
            return html;
        }

        var version = typeof(Plugin).Assembly.GetName().Version?.ToString() ?? "1.0.0.0";
        var tag = $"<script src=\"../CatScreensaver/cat-screensaver.js?v={version}\" defer></script>";

        var bodyEnd = html.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        return bodyEnd >= 0
            ? html.Insert(bodyEnd, tag + Environment.NewLine)
            : html + Environment.NewLine + tag;
    }
}
