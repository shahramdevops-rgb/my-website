using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;

namespace PersonalSite.IntegrationTests.Infrastructure;

/// <summary>
/// Requests built field by field on the in-memory server, for tests that need what <c>HttpClient</c> can't set:
/// the client's IP address (rate limits are per IP) and browser-only headers such as <c>Sec-Fetch-Site</c>.
/// </summary>
public static class ApiRequests
{
    private static int _lastAddress;

    /// <summary>
    /// A client address no other test uses (100.64.0.0/10, outside the trusted proxy network), so the per-IP rate
    /// limits of one test never count another test's requests.
    /// </summary>
    public static IPAddress NewClientAddress()
    {
        var n = Interlocked.Increment(ref _lastAddress);
        return new IPAddress([100, 64, (byte)(n >> 8), (byte)n]);
    }

    public static Task<HttpContext> SendAsync(
        this WebAppFactory factory,
        string method,
        string path,
        object? json = null,
        IPAddress? from = null,
        Action<HttpRequest>? configure = null) =>
        factory.Server.SendAsync(context =>
        {
            context.Connection.RemoteIpAddress = from ?? NewClientAddress();
            context.Request.Method = method;
            context.Request.Scheme = "http";
            context.Request.Host = new HostString("localhost");
            context.Request.Path = path;

            if (json is not null)
            {
                var body = JsonSerializer.SerializeToUtf8Bytes(json);
                context.Request.ContentType = "application/json";
                context.Request.ContentLength = body.Length;
                context.Request.Body = new MemoryStream(body);
                // The in-memory server decides "this request has no body" before this callback runs, and Minimal APIs
                // then refuse to bind one (400). A real server derives it from Content-Length, as set above.
                context.Features.Set<IHttpRequestBodyDetectionFeature>(new HasBody());
            }

            configure?.Invoke(context.Request);
        }, TestContext.Current.CancellationToken);

    public static async Task<JsonElement> ReadJsonAsync(this HttpResponse response)
    {
        using var document = await JsonDocument.ParseAsync(response.Body, cancellationToken: TestContext.Current.CancellationToken);
        return document.RootElement.Clone();
    }

    /// <summary>The <c>code</c> member of a ProblemDetails body.</summary>
    public static async Task<string?> ReadProblemCodeAsync(this HttpResponse response) =>
        (await response.ReadJsonAsync()).TryGetProperty("code", out var code) ? code.GetString() : null;

    private sealed class HasBody : IHttpRequestBodyDetectionFeature
    {
        public bool CanHaveBody => true;
    }
}
