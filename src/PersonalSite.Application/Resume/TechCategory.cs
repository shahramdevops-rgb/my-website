using System.Text.Json.Serialization;

namespace PersonalSite.Application.Resume;

/// <summary>
/// Which part of the stack a technology belongs to (P3-T11): it groups the keyboard's keycaps by color and sound.
/// Lowercase strings in the résumé files and on the wire; the attribute applies to both, so the content files and
/// the API can't spell it differently, and the OpenAPI document lists the four values (a TS union on the front-end).
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<TechCategory>))]
public enum TechCategory
{
    [JsonStringEnumMemberName("backend")]
    Backend,

    [JsonStringEnumMemberName("frontend")]
    Frontend,

    [JsonStringEnumMemberName("database")]
    Database,

    [JsonStringEnumMemberName("devops")]
    Devops,
}
