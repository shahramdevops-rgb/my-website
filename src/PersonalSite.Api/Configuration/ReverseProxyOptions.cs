using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;
using IPNetwork = System.Net.IPNetwork;

namespace PersonalSite.Api.Configuration;

/// <summary>
/// Which proxies may tell the API about the original request, bound from the <c>ReverseProxy</c> section
/// (env var: <c>ReverseProxy__TrustedNetworks__0</c>). Caddy terminates HTTPS and forwards plain HTTP, adding
/// <c>X-Forwarded-For</c> (client IP) and <c>X-Forwarded-Proto</c> (<c>https</c>). Those headers are only believed
/// when the request comes from a trusted address; otherwise anyone could claim any IP or scheme.
/// </summary>
public sealed class ReverseProxyOptions
{
    public const string SectionName = "ReverseProxy";

    /// <summary>
    /// CIDR networks of the proxy, e.g. <c>172.30.0.0/24</c> (the compose network pinned in compose.prod.yaml).
    /// Loopback is always trusted. Empty (dev, tests): forwarded headers from other addresses are ignored.
    /// </summary>
    public string[] TrustedNetworks { get; set; } = [];

    public bool IsValid() => TrustedNetworks.All(network => IPNetwork.TryParse(network, out _));
}

public static class ReverseProxyRegistration
{
    public static IServiceCollection AddReverseProxyHeaders(this IServiceCollection services)
    {
        services.AddOptions<ReverseProxyOptions>()
            .BindConfiguration(ReverseProxyOptions.SectionName)
            .Validate(options => options.IsValid(), "ReverseProxy:TrustedNetworks: every entry must be a CIDR network such as 172.30.0.0/24.")
            .ValidateOnStart();

        services.AddOptions<ForwardedHeadersOptions>()
            .Configure<IOptions<ReverseProxyOptions>>((forwarded, proxy) =>
            {
                // Client IP (rate limits, P8/P9) and scheme (HSTS, Secure cookies). Host is passed through by Caddy as is.
                forwarded.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                foreach (var network in proxy.Value.TrustedNetworks)
                {
                    forwarded.KnownIPNetworks.Add(IPNetwork.Parse(network));
                }
            });

        return services;
    }
}
