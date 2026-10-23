using System.Net;
using Microsoft.AspNetCore.Http;
using PersonalSite.Api.Infrastructure;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Security;

/// <summary>
/// Caddy terminates HTTPS and forwards plain HTTP with <c>X-Forwarded-Proto: https</c> (P4-T2). HSTS is only sent
/// on HTTPS requests, so its presence shows whether the API believed the forwarded scheme.
/// </summary>
public sealed class ForwardedHeadersTests(WebAppFactory factory)
{
    // Any non-localhost name: HSTS is never sent to localhost.
    private const string _host = "site.test";

    [Fact]
    public async Task GetHealth_HttpsForwardedByTrustedProxy_SendsHsts()
    {
        var context = await SendForwardedHttpsAsync(from: IPAddress.Parse("10.20.30.5"));

        context.Response.Headers.StrictTransportSecurity.ToString().ShouldBe("max-age=2592000");
    }

    [Fact]
    public async Task GetHealth_HttpsClaimedByUnknownAddress_SendsNoHsts()
    {
        // Same headers, but from outside the trusted network: the scheme stays http.
        var context = await SendForwardedHttpsAsync(from: IPAddress.Parse("192.0.2.10"));

        context.Response.Headers.StrictTransportSecurity.ShouldBeEmpty();
    }

    private Task<HttpContext> SendForwardedHttpsAsync(IPAddress from) =>
        factory.Server.SendAsync(context =>
        {
            context.Connection.RemoteIpAddress = from;
            context.Request.Method = HttpMethods.Get;
            context.Request.Scheme = "http";
            context.Request.Host = new HostString(_host);
            context.Request.Path = Routes.Health;
            context.Request.Headers["X-Forwarded-For"] = "203.0.113.7";
            context.Request.Headers["X-Forwarded-Proto"] = "https";
        }, TestContext.Current.CancellationToken);
}
