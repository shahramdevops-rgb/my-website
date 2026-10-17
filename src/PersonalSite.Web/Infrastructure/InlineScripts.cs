using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Html;

namespace PersonalSite.Web.Infrastructure;

/// <summary>
/// The site's only inline scripts. The CSP allows each one by the SHA-256 of its exact text rather than a nonce:
/// a hash stays valid when a page comes from a cache (output caching, P6), a per-request nonce would not.
/// Render as <c>&lt;script&gt;@InlineScripts.Theme&lt;/script&gt;</c> with nothing else inside the tag — a single
/// extra space changes the hash and the browser blocks the script.
/// </summary>
public static class InlineScripts
{
    // Runs in <head> before first paint: applies the saved theme, so a light-theme visitor never sees a dark flash.
    // It blocks rendering, so it stays tiny. "theme" is the storage key shared with wwwroot/js/stores/theme.js.
    // try/catch: localStorage throws where storage is blocked — the page then simply stays dark (the default).
    private const string _themeSource =
        """try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}""";

    /// <summary>Already-safe markup: Razor writes it as-is (normal encoding would turn the quotes into &amp;quot;).</summary>
    public static HtmlString Theme { get; } = new(_themeSource);

    /// <summary>CSP source expressions for every script above, e.g. <c>'sha256-…'</c>.</summary>
    public static string CspHashes { get; } = Hash(_themeSource);

    private static string Hash(string source) =>
        $"'sha256-{Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(source)))}'";
}
