namespace PersonalSite.Application.Features;

/// <summary>
/// Feature flag names (CLAUDE.md §10), read from the <c>FeatureManagement</c> configuration section.
/// A flag missing from configuration counts as off. Defaults live in the Api's <c>appsettings.json</c>.
/// </summary>
public static class FeatureFlags
{
    public const string NewsletterSignup = "Newsletter.Signup";
    public const string NewsletterSending = "Newsletter.Sending";
    public const string NotificationsEmail = "Notifications.Email";
    public const string CommentsEnabled = "Comments.Enabled";
    public const string AnalyticsUmami = "Analytics.Umami";
    public const string AiSemanticSearch = "Ai.SemanticSearch";
    public const string AiMcp = "Ai.Mcp";
    public const string AiAdminAssistant = "Ai.AdminAssistant";
    public const string AiChat = "Ai.Chat";
}
