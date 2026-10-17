namespace PersonalSite.Web.Infrastructure;

/// <summary>Header menu, in display order. <see cref="Item.LabelKey"/> is a resx key (Nav.*).</summary>
public static class MainNavigation
{
    public sealed record Item(string Page, string LabelKey);

    public static IReadOnlyList<Item> Items { get; } =
    [
        new(PageNames.Home, "Nav.Home"),
        new(PageNames.About, "Nav.About"),
        new(PageNames.Projects, "Nav.Projects"),
        new(PageNames.Blog, "Nav.Blog"),
        new(PageNames.Services, "Nav.Services"),
        new(PageNames.Resume, "Nav.Resume"),
        new(PageNames.Contact, "Nav.Contact"),
    ];
}
