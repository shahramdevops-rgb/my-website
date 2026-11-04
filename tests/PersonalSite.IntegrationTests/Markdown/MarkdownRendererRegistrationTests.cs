using Microsoft.Extensions.DependencyInjection;
using PersonalSite.Application.Common.Abstractions;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Markdown;

/// <summary>The renderer as the app wires it (P7-T1): one instance, configured with the site's own host.</summary>
public sealed class MarkdownRendererRegistrationTests(WebAppFactory factory)
{
    [Fact]
    public void Renderer_FromTheApp_IsOneSharedInstanceThatRenders()
    {
        var renderer = factory.Services.GetRequiredService<IMarkdownRenderer>();

        renderer.ShouldBeSameAs(factory.Services.GetRequiredService<IMarkdownRenderer>());
        renderer.Render("## سلام\n\n[x](https://example.com)").Html
            .ShouldBe("<h2 id=\"سلام\" dir=\"auto\">سلام</h2>\n<p dir=\"auto\"><a href=\"https://example.com\" rel=\"noopener nofollow\">x</a></p>");
    }
}
