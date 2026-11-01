using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.CatScreensaver.Web;

/// <summary>
/// Registers the index.html transformation through the File Transformation plugin.
/// The plugin is optional: without it everything keeps working, the script is just
/// not injected.
/// </summary>
public sealed class FileTransformationRegistrar : IHostedService
{
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(3);
    private const int MaxAttempts = 20;

    private readonly ILogger<FileTransformationRegistrar> _logger;
    private CancellationTokenSource? _cancellation;

    /// <summary>
    /// Initializes a new instance of the <see cref="FileTransformationRegistrar"/> class.
    /// </summary>
    /// <param name="logger">Logger.</param>
    public FileTransformationRegistrar(ILogger<FileTransformationRegistrar> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Gets a value indicating whether the transformation was registered.
    /// </summary>
    public static bool IsRegistered { get; private set; }

    /// <inheritdoc />
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _cancellation = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _ = RegisterWithRetryAsync(_cancellation.Token);
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task StopAsync(CancellationToken cancellationToken)
    {
        _cancellation?.Cancel();
        return Task.CompletedTask;
    }

    private async Task RegisterWithRetryAsync(CancellationToken cancellationToken)
    {
        var warned = false;

        for (var attempt = 0; attempt < MaxAttempts; attempt++)
        {
            try
            {
                if (TryRegister(out var reason))
                {
                    IsRegistered = true;
                    _logger.LogInformation("Cat Screensaver registered its index.html transformation.");
                    return;
                }

                if (!warned)
                {
                    _logger.LogWarning(
                        "File Transformation is not available yet ({Reason}). Cat Screensaver will retry for a minute.",
                        reason);
                    warned = true;
                }
            }
            catch (Exception ex)
            {
                if (!warned)
                {
                    _logger.LogWarning(ex, "Could not register the Cat Screensaver transformation yet. Retrying.");
                    warned = true;
                }
            }

            try
            {
                await Task.Delay(RetryDelay, cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }

        _logger.LogWarning(
            "File Transformation was not found. Install IAmParadox27/jellyfin-plugin-file-transformation, "
            + "or inject /CatScreensaver/cat-screensaver.js manually. The screensaver script was not added to index.html.");
    }

    /// <summary>
    /// One registration attempt, using reflection because File Transformation cannot
    /// be referenced as a normal package.
    /// </summary>
    /// <param name="reason">Failure reason.</param>
    /// <returns>True when registered.</returns>
    internal static bool TryRegister(out string reason)
    {
        var transformationAssembly = AssemblyLoadContext.All
            .SelectMany(context => context.Assemblies)
            .FirstOrDefault(assembly => assembly.GetName().Name == "Jellyfin.Plugin.FileTransformation");

        if (transformationAssembly is null)
        {
            reason = "the plugin assembly is not loaded";
            return false;
        }

        var interfaceType = transformationAssembly.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface");
        var method = interfaceType?.GetMethod("RegisterTransformation", BindingFlags.Public | BindingFlags.Static);
        if (method is null || method.GetParameters().Length != 1)
        {
            reason = "PluginInterface.RegisterTransformation was not found";
            return false;
        }

        var json = JsonSerializer.Serialize(new
        {
            id = Plugin.PluginId,
            fileNamePattern = "index\\.html$",
            callbackAssembly = typeof(IndexTransformer).Assembly.FullName,
            callbackClass = typeof(IndexTransformer).FullName,
            callbackMethod = nameof(IndexTransformer.Transform)
        });

        object? argument;
        if (method.GetParameters()[0].ParameterType == typeof(string))
        {
            argument = json;
        }
        else
        {
            var jObjectType = AppDomain.CurrentDomain.GetAssemblies()
                .Select(assembly => assembly.GetType("Newtonsoft.Json.Linq.JObject", throwOnError: false))
                .FirstOrDefault(type => type is not null)
                ?? Type.GetType("Newtonsoft.Json.Linq.JObject, Newtonsoft.Json", throwOnError: false);

            var parse = jObjectType?.GetMethod(
                "Parse",
                BindingFlags.Public | BindingFlags.Static,
                binder: null,
                types: [typeof(string)],
                modifiers: null);

            if (parse is null)
            {
                reason = "Newtonsoft.Json.Linq.JObject.Parse was not found";
                return false;
            }

            argument = parse.Invoke(null, [json]);
        }

        method.Invoke(null, [argument]);
        reason = string.Empty;
        return true;
    }
}
