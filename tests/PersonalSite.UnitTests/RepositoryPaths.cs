namespace PersonalSite.UnitTests;

/// <summary>Finds source files of the Web project, for tests that check markup or CSS as written.</summary>
internal static class RepositoryPaths
{
    private static readonly Lazy<string> _root = new(FindRoot);

    public static string Web(params string[] parts) => Path.Combine([_root.Value, "src", "PersonalSite.Web", .. parts]);

    // Walks up from bin/ to the folder that holds the solution file.
    private static string FindRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "PersonalSite.slnx")))
        {
            directory = directory.Parent;
        }

        directory.ShouldNotBeNull("Repository root (PersonalSite.slnx) not found");
        return directory.FullName;
    }
}
