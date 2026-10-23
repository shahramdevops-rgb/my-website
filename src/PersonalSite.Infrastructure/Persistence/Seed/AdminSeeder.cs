using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PersonalSite.Infrastructure.Identity;

namespace PersonalSite.Infrastructure.Persistence.Seed;

public enum AdminSeedResult
{
    /// <summary>No admin yet and no <c>Admin:*</c> settings: nobody can sign in until they are set.</summary>
    NotConfigured,

    /// <summary>An admin exists; the settings (if any) were not used. A seeded password is never overwritten.</summary>
    AlreadyExists,

    Created,
}

/// <summary>
/// Creates the single admin account and the <c>Admin</c> role (P5-T2). There is no registration endpoint: this is
/// the only way an account comes into existence. Runs where migrations run — the <c>--migrate</c> deploy step in
/// production, startup in Development — so a normal web start never writes to the database.
/// </summary>
public sealed partial class AdminSeeder(
    AppDbContext db,
    UserManager<AppUser> users,
    RoleManager<IdentityRole<Guid>> roles,
    IOptions<AdminSeedOptions> options,
    ILogger<AdminSeeder> logger)
{
    public async Task<AdminSeedResult> SeedAsync(CancellationToken ct)
    {
        // Throws OptionsValidationException for a half-filled section, also in --migrate (no ValidateOnStart there).
        var settings = options.Value;

        // Role, user and membership are one unit: a crash in between must not leave a user without the role,
        // which the next run would not repair (it would try to create the same user again and fail).
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        if (!await roles.RoleExistsAsync(AppRoles.Admin))
        {
            Succeeded(await roles.CreateAsync(new IdentityRole<Guid>(AppRoles.Admin) { Id = Guid.CreateVersion7() }), "create the Admin role");
        }

        // "Once": any existing admin wins over the settings, so changing Admin__Password later changes nothing.
        if ((await users.GetUsersInRoleAsync(AppRoles.Admin)).Count > 0)
        {
            await transaction.CommitAsync(ct);
            LogAlreadyExists(logger);
            return AdminSeedResult.AlreadyExists;
        }

        if (!settings.IsConfigured)
        {
            await transaction.CommitAsync(ct);
            LogNotConfigured(logger);
            return AdminSeedResult.NotConfigured;
        }

        var admin = new AppUser { UserName = settings.Email, Email = settings.Email, EmailConfirmed = true };
        // CreateAsync runs the password rules (length ≥ 12) and stores only the hash (PBKDF2, salted).
        Succeeded(await users.CreateAsync(admin, settings.Password!), "create the admin account");
        Succeeded(await users.AddToRoleAsync(admin, AppRoles.Admin), "add the admin account to the Admin role");

        await transaction.CommitAsync(ct);
        LogCreated(logger, admin.Email!);
        return AdminSeedResult.Created;
    }

    // A rejected password or email is a deployment mistake: fail the step loudly instead of running without an admin.
    private static void Succeeded(IdentityResult result, string action)
    {
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                $"Admin seeding could not {action}: {string.Join(" ", result.Errors.Select(error => error.Description))}");
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Admin account exists; Admin settings not used")]
    private static partial void LogAlreadyExists(ILogger logger);

    [LoggerMessage(Level = LogLevel.Warning, Message = "No admin account and Admin__Email/Admin__Password are not set: nobody can sign in to the admin panel")]
    private static partial void LogNotConfigured(ILogger logger);

    [LoggerMessage(Level = LogLevel.Information, Message = "Admin account {Email} created")]
    private static partial void LogCreated(ILogger logger, string email);
}

public static class AdminSeeding
{
    /// <summary>Runs <see cref="AdminSeeder"/> in its own scope (there is no request scope at startup).</summary>
    public static async Task<AdminSeedResult> SeedAdminAsync(this IServiceProvider services, CancellationToken ct)
    {
        await using var scope = services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<AdminSeeder>().SeedAsync(ct);
    }
}
