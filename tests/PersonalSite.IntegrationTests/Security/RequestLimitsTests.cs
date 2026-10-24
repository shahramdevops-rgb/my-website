using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using PersonalSite.Api;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Security;

/// <summary>
/// Kestrel's limits (P4-T7). The in-memory test server doesn't run Kestrel, so the configured options are checked;
/// Kestrel itself answers 413 for a larger body.
/// </summary>
public sealed class RequestLimitsTests(WebAppFactory factory)
{
    [Fact]
    public void KestrelOptions_Always_CapRequestBodiesAtOneMegabyte()
    {
        var options = factory.Services.GetRequiredService<IOptions<KestrelServerOptions>>().Value;

        options.Limits.MaxRequestBodySize.ShouldBe(DependencyInjection.MaxRequestBodySize);
        DependencyInjection.MaxRequestBodySize.ShouldBe(1024 * 1024);
    }
}
