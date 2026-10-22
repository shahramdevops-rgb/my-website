using System.Net;
using System.Text.Json;
using PersonalSite.Api.Infrastructure;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Resume;

public sealed class ResumeEndpointsTests(WebAppFactory factory)
{
    [Theory]
    [InlineData("fa", "مهدی ازقندی", "دانشگاه شهید بهشتی")]
    [InlineData("en", "Mahdi Azghandi", "Shahid Beheshti University")]
    public async Task GetResume_SupportedLanguage_ReturnsThatLanguagesProfile(string lang, string name, string firstInstitution)
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(ResumeUri(lang), TestContext.Current.CancellationToken);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));

        // Raw JSON on purpose: these property names are the contract the front-end's types are generated from.
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var root = body.RootElement;
        root.GetProperty("basics").GetProperty("name").GetString().ShouldBe(name);
        root.GetProperty("education")[0].GetProperty("institution").GetString().ShouldBe(firstInstitution);
        root.GetProperty("experience").GetArrayLength().ShouldBeGreaterThan(0);
        root.GetProperty("skills").GetArrayLength().ShouldBeGreaterThan(0);
        root.GetProperty("techStack")[0].GetProperty("id").GetString().ShouldBe("csharp");
        root.GetProperty("links").ValueKind.ShouldBe(JsonValueKind.Array);
    }

    [Theory]
    [InlineData("")]
    [InlineData("?lang=de")]
    [InlineData("?lang=")]
    [InlineData("?lang=FA")]
    [InlineData("?lang=5")] // enum binding would accept this as an undefined Language (see LanguageParameter)
    public async Task GetResume_MissingOrUnsupportedLanguage_ReturnsProblemDetails400(string query)
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(new Uri(Routes.Api + Routes.Resume + query, UriKind.Relative), TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");
    }

    private static Uri ResumeUri(string lang) => new($"{Routes.Api}{Routes.Resume}?lang={lang}", UriKind.Relative);
}
