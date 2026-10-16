using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace PersonalSite.Web.Pages;

/// <summary>
/// Rendered by the exception handler middleware (production only) for unhandled exceptions.
/// Never cached; no antiforgery check, because a failed POST is re-executed here too.
/// </summary>
[ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
[IgnoreAntiforgeryToken]
public sealed class ErrorModel : PageModel
{
}
