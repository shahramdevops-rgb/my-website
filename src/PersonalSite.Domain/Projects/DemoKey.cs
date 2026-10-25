namespace PersonalSite.Domain.Projects;

/// <summary>
/// The live demo a project's page embeds (ADR-027). A closed list on purpose: a key only means something if a demo
/// with that key is built into the site, so the admin picks from these instead of typing free text.
/// </summary>
public enum DemoKey
{
    Cinema,
    Gym,
}
