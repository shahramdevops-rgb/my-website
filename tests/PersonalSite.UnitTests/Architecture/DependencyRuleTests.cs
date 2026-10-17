using System.Reflection;

namespace PersonalSite.UnitTests.Architecture;

/// <summary>
/// Guards the dependency rule from architecture.md §3.1:
/// Api → Application → Domain, Infrastructure → Application. Never the other way round.
/// </summary>
public sealed class DependencyRuleTests
{
    [Fact]
    public void Domain_ReferencesNoOtherLayerOrFramework()
    {
        var references = ReferencedAssemblyNames(typeof(PersonalSite.Domain.AssemblyReference).Assembly);

        Assert.DoesNotContain(references, name => name.StartsWith("PersonalSite.", StringComparison.Ordinal));
        Assert.DoesNotContain(references, name => name.StartsWith("Microsoft.EntityFrameworkCore", StringComparison.Ordinal));
        Assert.DoesNotContain(references, name => name.StartsWith("Microsoft.AspNetCore", StringComparison.Ordinal));
    }

    [Fact]
    public void Application_DoesNotReferenceInfrastructureOrApi()
    {
        var references = ReferencedAssemblyNames(typeof(PersonalSite.Application.AssemblyReference).Assembly);

        Assert.DoesNotContain("PersonalSite.Infrastructure", references);
        Assert.DoesNotContain("PersonalSite.Api", references);
        Assert.DoesNotContain(references, name => name.StartsWith("Microsoft.AspNetCore", StringComparison.Ordinal));
    }

    [Fact]
    public void Infrastructure_DoesNotReferenceApi()
    {
        var references = ReferencedAssemblyNames(typeof(PersonalSite.Infrastructure.AssemblyReference).Assembly);

        Assert.DoesNotContain("PersonalSite.Api", references);
    }

    private static string[] ReferencedAssemblyNames(Assembly assembly) =>
        [.. assembly.GetReferencedAssemblies().Select(name => name.Name ?? string.Empty)];
}
