using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Pages;

/// <summary>Page JavaScript: self-hosted ES modules and Alpine components (P1-T7), the inline theme script (P1-T6).</summary>
public sealed partial class ScriptsTests(WebAppFactory factory)
{
    [Fact]
    public async Task GetHome_ModuleGraph_IsServedFromOwnOrigin()
    {
        using var client = factory.CreateClient();
        var ct = TestContext.Current.CancellationToken;
        var pageUri = new Uri(client.BaseAddress!, "/fa");
        var html = await client.GetStringAsync(pageUri, ct);

        var entry = ModuleScriptSrc().Match(html);
        entry.Success.ShouldBeTrue("layout should load /js/app.js as a module");

        // Follow every import, as the browser does: a broken path would silently disable all page JS.
        var pending = new Queue<Uri>([new Uri(pageUri, entry.Groups["src"].Value)]);
        var visited = new HashSet<Uri>();
        while (pending.TryDequeue(out var moduleUri))
        {
            if (!visited.Add(moduleUri))
            {
                continue;
            }

            moduleUri.Host.ShouldBe(pageUri.Host, $"{moduleUri} leaves the site's origin");
            using var response = await client.GetAsync(moduleUri, ct);
            response.StatusCode.ShouldBe(HttpStatusCode.OK, moduleUri.ToString());
            response.Content.Headers.ContentType?.MediaType.ShouldBe("text/javascript", moduleUri.ToString());

            var source = await response.Content.ReadAsStringAsync(ct);
            foreach (Match import in ImportSpecifier().Matches(source))
            {
                pending.Enqueue(new Uri(moduleUri, import.Groups["spec"].Value));
            }
        }

        visited.ShouldContain(uri => uri.AbsolutePath.StartsWith("/lib/alpine-", StringComparison.Ordinal), "Alpine is not imported");
    }

    [Fact]
    public async Task GetHome_AlpineComponents_AreRegisteredInAppJs()
    {
        using var client = factory.CreateClient();
        var ct = TestContext.Current.CancellationToken;
        var html = await client.GetStringAsync(new Uri("/fa", UriKind.Relative), ct);
        var appJs = await client.GetStringAsync(new Uri("/js/app.js", UriKind.Relative), ct);

        // The CSP build has no eval: an x-data name that app.js never registered just does nothing, without an error.
        string[] used = [.. XData().Matches(html).Select(m => m.Groups["name"].Value).Distinct()];
        string[] registered = [.. AlpineData().Matches(appJs).Select(m => m.Groups["name"].Value)];

        used.ShouldNotBeEmpty();
        used.ShouldBeSubsetOf(registered);
    }

    [Fact]
    public async Task GetHome_InlineScripts_AreAllowedByCspHash()
    {
        using var client = factory.CreateClient();
        var ct = TestContext.Current.CancellationToken;
        using var response = await client.GetAsync(new Uri("/fa", UriKind.Relative), ct);
        var html = await response.Content.ReadAsStringAsync(ct);
        var policy = response.Headers.GetValues("Content-Security-Policy").ShouldHaveSingleItem();

        // The browser hashes the exact text between the tags; any other inline script would be blocked silently.
        string[] inlineScripts = [.. InlineScript().Matches(html).Select(m => m.Groups["body"].Value)];
        inlineScripts.ShouldNotBeEmpty("the theme script should be inline");
        foreach (var script in inlineScripts)
        {
            var hash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(script)));
            policy.ShouldContain($"'sha256-{hash}'", customMessage: script);
        }
    }

    [Fact]
    public async Task GetHome_ThemeScript_RunsBeforeStylesheet()
    {
        using var client = factory.CreateClient();
        var html = await client.GetStringAsync(new Uri("/fa", UriKind.Relative), TestContext.Current.CancellationToken);

        // It must set data-theme before the first paint, i.e. before the browser can render with the CSS.
        var script = InlineScript().Match(html);
        script.Success.ShouldBeTrue();
        script.Index.ShouldBeLessThan(html.IndexOf("<link rel=\"stylesheet\"", StringComparison.Ordinal));
        script.Value.ShouldContain("localStorage");
    }

    [GeneratedRegex(@"<script type=""module"" src=""(?<src>/js/app[^""]*)""")]
    private static partial Regex ModuleScriptSrc();

    [GeneratedRegex(@"\bimport\s+(?:[\w*{}\s,]+\s+from\s+)?[""'](?<spec>[^""']+)[""']")]
    private static partial Regex ImportSpecifier();

    [GeneratedRegex(@"\bx-data=""(?<name>[^""]+)""")]
    private static partial Regex XData();

    [GeneratedRegex(@"Alpine\.data\(""(?<name>[^""]+)""")]
    private static partial Regex AlpineData();

    [GeneratedRegex("<script>(?<body>.*?)</script>", RegexOptions.Singleline)]
    private static partial Regex InlineScript();
}
