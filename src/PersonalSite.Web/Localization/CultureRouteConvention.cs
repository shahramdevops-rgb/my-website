using Microsoft.AspNetCore.Mvc.ApplicationModels;
using PersonalSite.Web.Infrastructure;

namespace PersonalSite.Web.Localization;

/// <summary>
/// Prefixes every public page with <c>{culture:culture}</c> (architecture.md §6), so page files keep short
/// templates (<c>@page "{slug}"</c>) and cannot forget the language: <c>Pages/Index</c> → <c>/fa</c>,
/// <c>Pages/Blog/Post</c> → <c>/fa/blog/{slug}</c>. Admin pages (an area) and technical pages stay unprefixed.
/// </summary>
public sealed class CultureRouteConvention : IPageRouteModelConvention
{
    public const string RouteKey = "culture";

    private static readonly string _prefix = $"{{{RouteKey}:{CultureRouteConstraint.Name}}}";

    // Pages that must work without a language segment (e.g. the exception handler re-executes /Error).
    private static readonly HashSet<string> _unprefixedPages = new(StringComparer.OrdinalIgnoreCase) { Routes.Error };

    public void Apply(PageRouteModel model)
    {
        if (model.AreaName is not null || _unprefixedPages.Contains(model.ViewEnginePath))
        {
            return;
        }

        foreach (var selector in model.Selectors)
        {
            if (selector.AttributeRouteModel is { } route)
            {
                route.Template = AttributeRouteModel.CombineTemplates(_prefix, route.Template);
            }
        }
    }
}
