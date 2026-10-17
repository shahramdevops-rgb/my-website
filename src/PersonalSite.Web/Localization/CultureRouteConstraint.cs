using Microsoft.Extensions.Options;
using PersonalSite.Web.Configuration;

namespace PersonalSite.Web.Localization;

/// <summary>
/// <c>{culture:culture}</c> matches only a supported culture, so <c>/en/...</c> is a plain 404 until English
/// is switched on, instead of rendering Persian pages under an English URL.
/// </summary>
public sealed class CultureRouteConstraint(IOptions<CultureOptions> options) : IRouteConstraint
{
    /// <summary>Name used in route templates: <c>{culture:culture}</c>.</summary>
    public const string Name = "culture";

    public bool Match(
        HttpContext? httpContext,
        IRouter? route,
        string routeKey,
        RouteValueDictionary values,
        RouteDirection routeDirection) =>
        values.TryGetValue(routeKey, out var value) && options.Value.IsSupported(value as string);
}
