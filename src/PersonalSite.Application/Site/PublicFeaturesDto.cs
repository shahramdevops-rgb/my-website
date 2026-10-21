namespace PersonalSite.Application.Site;

/// <summary>
/// Only the flags that change what a visitor sees. Back-office flags (<c>Newsletter.Sending</c>,
/// <c>Notifications.Email</c>, <c>Ai.AdminAssistant</c> …) stay private: they are nobody else's business.
/// </summary>
public sealed record PublicFeaturesDto(bool NewsletterSignup, bool Comments, bool Analytics, bool SemanticSearch);
