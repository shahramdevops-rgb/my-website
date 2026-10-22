using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Options;
using PersonalSite.Api.Configuration;
using PersonalSite.Application;

namespace PersonalSite.IntegrationTests.Resume;

/// <summary>
/// A broken résumé file must stop the app at startup (ADR-013). These tests run the real registration
/// (<c>AddApplication</c> + <c>AddResumeContent</c>) against a temporary content root and call the same
/// <see cref="IStartupValidator"/> the host runs before it accepts requests. No web host is built: only one host
/// per test process is allowed (see WebAppFactory), and none is needed to exercise the startup check.
/// </summary>
public sealed class ResumeContentStartupTests : IDisposable
{
    private readonly DirectoryInfo _contentRoot = Directory.CreateTempSubdirectory("resume-content-");

    public ResumeContentStartupTests()
    {
        // Start from the real files (the Api's build copies Content/ next to this test assembly), then break one.
        var source = Path.Combine(AppContext.BaseDirectory, ResumeContentLoader.DirectoryName);
        Directory.CreateDirectory(ContentDirectory);
        foreach (var file in Directory.GetFiles(source, "resume.*.json"))
        {
            File.Copy(file, Path.Combine(ContentDirectory, Path.GetFileName(file)));
        }
    }

    private string ContentDirectory => Path.Combine(_contentRoot.FullName, ResumeContentLoader.DirectoryName);

    [Fact]
    public void StartupValidation_RealFiles_Passes() => Should.NotThrow(RunStartupValidation);

    [Fact]
    public void StartupValidation_FileMissing_FailsNamingTheFile()
    {
        File.Delete(FilePath("en"));

        Should.Throw<InvalidOperationException>(RunStartupValidation).Message.ShouldContain("resume.en.json");
    }

    [Fact]
    public void StartupValidation_RequiredFieldMissing_FailsNamingTheField()
    {
        EditFile("fa", root => root["basics"]!.AsObject().Remove("headline"));

        var exception = Should.Throw<InvalidOperationException>(RunStartupValidation);

        exception.Message.ShouldContain("resume.fa.json");
        exception.Message.ShouldContain("headline");
    }

    [Fact]
    public void StartupValidation_UnknownField_Fails()
    {
        // A typo ("sumary") would otherwise be ignored and the real field reported missing — or worse, silently empty.
        EditFile("en", root => root["basics"]!["sumary"] = "typo");

        Should.Throw<InvalidOperationException>(RunStartupValidation).Message.ShouldContain("sumary");
    }

    [Fact]
    public void StartupValidation_InvalidValue_FailsWithValidationMessage()
    {
        EditFile("en", root => root["experience"]![0]!["start"] = "2021/03");

        Should.Throw<OptionsValidationException>(RunStartupValidation)
            .Failures.ShouldContain("en: experience[0].start must be a month as yyyy-MM.");
    }

    public void Dispose() => _contentRoot.Delete(recursive: true);

    private void RunStartupValidation()
    {
        var services = new ServiceCollection()
            .AddSingleton<IHostEnvironment>(new HostingEnvironment { ContentRootPath = _contentRoot.FullName })
            .AddApplication()
            .AddResumeContent();

        using var provider = services.BuildServiceProvider();
        provider.GetRequiredService<IStartupValidator>().Validate();
    }

    private string FilePath(string language) => Path.Combine(ContentDirectory, $"resume.{language}.json");

    private void EditFile(string language, Action<JsonNode> change)
    {
        var path = FilePath(language);
        var root = JsonNode.Parse(File.ReadAllText(path))!;
        change(root);
        File.WriteAllText(path, root.ToJsonString());
    }
}
