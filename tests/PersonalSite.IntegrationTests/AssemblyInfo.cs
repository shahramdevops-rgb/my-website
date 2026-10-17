using PersonalSite.IntegrationTests.Infrastructure;

// One app + one PostgreSQL container shared by every test class in this assembly.
// Test classes receive it through their constructor: `public sealed class FooTests(WebAppFactory factory)`.
[assembly: AssemblyFixture(typeof(WebAppFactory))]
