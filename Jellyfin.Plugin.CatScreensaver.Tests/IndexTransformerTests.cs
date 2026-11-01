using Jellyfin.Plugin.CatScreensaver.Web;
using Xunit;

namespace Jellyfin.Plugin.CatScreensaver.Tests;

public class IndexTransformerTests
{
    private static string Transform(string html)
    {
        return IndexTransformer.Transform(new TransformationContents { Contents = html });
    }

    [Fact]
    public void InjectsTheScriptBeforeTheBodyEnd()
    {
        var result = Transform("<html><body><div>web</div></body></html>");

        Assert.Contains("cat-screensaver.js", result);
        Assert.Contains("../CatScreensaver/cat-screensaver.js?v=", result);
        Assert.True(result.IndexOf("cat-screensaver.js", StringComparison.Ordinal)
            < result.IndexOf("</body>", StringComparison.Ordinal));
        Assert.Contains("defer", result);
    }

    [Fact]
    public void IsIdempotent()
    {
        var once = Transform("<html><body>hello</body></html>");
        var twice = Transform(once);

        Assert.Equal(once, twice);
    }

    [Fact]
    public void AppendsWhenThereIsNoBodyTag()
    {
        var result = Transform("<html><div>fragment</div></html>");

        Assert.Contains("cat-screensaver.js", result);
        Assert.True(result.IndexOf("<script", StringComparison.Ordinal)
            > result.IndexOf("</html>", StringComparison.Ordinal));
    }

    [Fact]
    public void RegistersTheExactIndexKeyThatOtherPluginsUse()
    {
        // File Transformation runs only the exact pipeline when one exists, so the
        // registration cannot be a regex.
        Assert.Equal("index.html", IndexTransformer.FileNamePattern);
    }

    [Fact]
    public void WorksWithABasePathBecauseTheUrlIsRelative()
    {
        var result = Transform("<html><body></body></html>");

        Assert.Contains("src=\"../CatScreensaver/", result);
        Assert.DoesNotContain("src=\"/CatScreensaver/", result);
    }

    [Fact]
    public void KeepsTheBodyCloseLast()
    {
        var result = Transform("<html><body><p>end</p></BODY></html>");

        Assert.True(result.IndexOf("<script", StringComparison.Ordinal)
            < result.IndexOf("</BODY>", StringComparison.OrdinalIgnoreCase));
        Assert.True(result.IndexOf("</BODY>", StringComparison.OrdinalIgnoreCase)
            < result.IndexOf("</html>", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void HandlesEmptyContent()
    {
        Assert.Equal(string.Empty, IndexTransformer.Transform(new TransformationContents()));
        Assert.Equal(string.Empty, IndexTransformer.Transform(null));
    }
}
