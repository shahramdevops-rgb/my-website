namespace PersonalSite.Web.Infrastructure;

/// <summary>
/// Razor Page names for <c>asp-page</c> / <c>Url.Page</c> — never hand-built URLs (rules.md). The culture prefix
/// (<c>/fa</c>) is added by routing, so a page name is the same in every language.
/// </summary>
public static class PageNames
{
    public const string Home = "/Index";
    public const string About = "/About";
    public const string Projects = "/Projects/Index";
    public const string Blog = "/Blog/Index";
    public const string Services = "/Services";
    public const string Resume = "/Resume";
    public const string Contact = "/Contact";
}
