using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.CatScreensaver.Configuration;

/// <summary>
/// Plugin configuration. Every numeric setter clamps the value, including values
/// coming from an old XML file.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    private static readonly string[] ValidPalettes = ["orange", "black", "gray", "white", "calico"];

    private bool _enabled = true;
    private int _idleTimeoutSeconds = 180;
    private int _catCount = 1;
    private double _catScale = 1.0;
    private double _backgroundDim = 0.85;
    private bool _showClock = true;
    private bool _activateDuringMusic = true;
    private bool _driftAntiBurnIn = true;
    private bool _allowUserOptOut = true;

    /// <summary>
    /// Gets or sets a value indicating whether the screensaver is active.
    /// </summary>
    public bool Enabled
    {
        get => _enabled;
        set => _enabled = value;
    }

    /// <summary>
    /// Gets or sets the idle time before activation, in seconds (30-3600).
    /// </summary>
    public int IdleTimeoutSeconds
    {
        get => _idleTimeoutSeconds;
        set => _idleTimeoutSeconds = Math.Clamp(value, 30, 3600);
    }

    /// <summary>
    /// Gets or sets how many cats appear (1-5).
    /// </summary>
    public int CatCount
    {
        get => _catCount;
        set => _catCount = Math.Clamp(value, 1, 5);
    }

    /// <summary>
    /// Gets or sets the cat scale relative to a 96 px tall sprite (0.5-3.0).
    /// </summary>
    public double CatScale
    {
        get => _catScale;
        set => _catScale = Math.Clamp(value, 0.5, 3.0);
    }

    /// <summary>
    /// Gets or sets palettes assigned to cats in order. Unknown names are dropped.
    /// </summary>
    public List<string> CatPalettes { get; set; } = ["orange", "black", "gray", "white", "calico"];

    /// <summary>
    /// Gets or sets the opacity of the black overlay (0-1).
    /// </summary>
    public double BackgroundDim
    {
        get => _backgroundDim;
        set => _backgroundDim = Math.Clamp(value, 0, 1);
    }

    /// <summary>
    /// Gets or sets a value indicating whether the clock is shown.
    /// </summary>
    public bool ShowClock
    {
        get => _showClock;
        set => _showClock = value;
    }

    /// <summary>
    /// Gets or sets a value indicating whether the screensaver may run while music plays.
    /// </summary>
    public bool ActivateDuringMusic
    {
        get => _activateDuringMusic;
        set => _activateDuringMusic = value;
    }

    /// <summary>
    /// Gets or sets a value indicating whether the clock moves every minute to avoid burn-in.
    /// </summary>
    public bool DriftAntiBurnIn
    {
        get => _driftAntiBurnIn;
        set => _driftAntiBurnIn = value;
    }

    /// <summary>
    /// Gets or sets a value indicating whether each browser may opt out.
    /// </summary>
    public bool AllowUserOptOut
    {
        get => _allowUserOptOut;
        set => _allowUserOptOut = value;
    }

    /// <summary>
    /// Cleans lists and guarantees at least one valid palette.
    /// </summary>
    public void Normalize()
    {
        var palettes = (CatPalettes ?? [])
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name.Trim().ToLowerInvariant())
            .Where(name => ValidPalettes.Contains(name))
            .Distinct(StringComparer.Ordinal)
            .ToList();

        CatPalettes = palettes.Count == 0 ? ["orange"] : palettes;
    }
}
