namespace PersonalSite.Domain.Common;

/// <summary>
/// A site language (ADR-016). Written as lowercase codes on the wire and in the DB (<c>fa</c>, <c>en</c>);
/// the mapping lives at the edges (JSON options, EF conversions), not here.
/// </summary>
public enum Language
{
    Fa,
    En,
}
