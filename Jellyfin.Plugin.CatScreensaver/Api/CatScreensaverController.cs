using Jellyfin.Plugin.CatScreensaver.Configuration;
using Jellyfin.Plugin.CatScreensaver.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.CatScreensaver.Api;

/// <summary>
/// Serves the browser bundle and the public configuration.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("CatScreensaver")]
public sealed class CatScreensaverController : ControllerBase
{
    private const string ScriptResource = "Jellyfin.Plugin.CatScreensaver.Web.cat-screensaver.js";

    /// <summary>
    /// Returns the single-file browser bundle.
    /// </summary>
    /// <returns>JavaScript.</returns>
    [HttpGet("cat-screensaver.js")]
    [Produces("application/javascript")]
    public IActionResult Script()
    {
        var stream = typeof(Plugin).Assembly.GetManifestResourceStream(ScriptResource);
        if (stream is null)
        {
            return NotFound();
        }

        Response.Headers["Cache-Control"] = "public, max-age=86400";
        return File(stream, "application/javascript; charset=utf-8");
    }

    /// <summary>
    /// Returns the non-sensitive configuration used by the script.
    /// </summary>
    /// <returns>Public configuration.</returns>
    [HttpGet("Config")]
    public ActionResult<Dictionary<string, object?>> Config()
    {
        var configuration = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        configuration.Normalize();

        Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";

        return Ok(new Dictionary<string, object?>
        {
            ["Enabled"] = configuration.Enabled,
            ["IdleTimeoutSeconds"] = configuration.IdleTimeoutSeconds,
            ["CatCount"] = configuration.CatCount,
            ["CatScale"] = configuration.CatScale,
            ["CatPalettes"] = configuration.CatPalettes,
            ["BackgroundDim"] = configuration.BackgroundDim,
            ["ShowClock"] = configuration.ShowClock,
            ["ActivateDuringMusic"] = configuration.ActivateDuringMusic,
            ["DriftAntiBurnIn"] = configuration.DriftAntiBurnIn,
            ["AllowUserOptOut"] = configuration.AllowUserOptOut,
            ["FileTransformationAvailable"] = FileTransformationRegistrar.IsRegistered
        });
    }
}
