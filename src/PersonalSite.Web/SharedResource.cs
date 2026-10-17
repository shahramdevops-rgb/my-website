namespace PersonalSite.Web;

/// <summary>
/// Marker type for UI strings shared across pages: <c>IStringLocalizer&lt;SharedResource&gt;</c> reads
/// <c>Resources/SharedResource.{culture}.resx</c>. It lives in the root namespace because the resx path is
/// derived from the type name (PersonalSite.Web.SharedResource → Resources/SharedResource.fa.resx).
/// </summary>
public sealed class SharedResource;
