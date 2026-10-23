using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalSite.Infrastructure.Identity;

namespace PersonalSite.Infrastructure.Persistence.Configurations;

// IdentityDbContext names its tables ("AspNetUsers") and three indexes ("UserNameIndex") explicitly, and the
// snake_case naming convention only rewrites names nobody set. These classes rename them to match every other table
// (architecture.md §4), so SQL needs no quoted identifiers: SELECT * FROM asp_net_users. Columns, keys and foreign
// keys already come out in snake_case.

internal sealed class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> builder)
    {
        builder.ToTable("asp_net_users");
        builder.HasIndex(user => user.NormalizedUserName).HasDatabaseName("ix_asp_net_users_normalized_user_name");
        builder.HasIndex(user => user.NormalizedEmail).HasDatabaseName("ix_asp_net_users_normalized_email");
    }
}

internal sealed class IdentityRoleConfiguration : IEntityTypeConfiguration<IdentityRole<Guid>>
{
    public void Configure(EntityTypeBuilder<IdentityRole<Guid>> builder)
    {
        builder.ToTable("asp_net_roles");
        builder.HasIndex(role => role.NormalizedName).HasDatabaseName("ix_asp_net_roles_normalized_name");
    }
}

internal sealed class IdentityUserRoleConfiguration : IEntityTypeConfiguration<IdentityUserRole<Guid>>
{
    public void Configure(EntityTypeBuilder<IdentityUserRole<Guid>> builder) => builder.ToTable("asp_net_user_roles");
}

internal sealed class IdentityUserClaimConfiguration : IEntityTypeConfiguration<IdentityUserClaim<Guid>>
{
    public void Configure(EntityTypeBuilder<IdentityUserClaim<Guid>> builder) => builder.ToTable("asp_net_user_claims");
}

internal sealed class IdentityUserLoginConfiguration : IEntityTypeConfiguration<IdentityUserLogin<Guid>>
{
    public void Configure(EntityTypeBuilder<IdentityUserLogin<Guid>> builder) => builder.ToTable("asp_net_user_logins");
}

internal sealed class IdentityUserTokenConfiguration : IEntityTypeConfiguration<IdentityUserToken<Guid>>
{
    public void Configure(EntityTypeBuilder<IdentityUserToken<Guid>> builder) => builder.ToTable("asp_net_user_tokens");
}

internal sealed class IdentityRoleClaimConfiguration : IEntityTypeConfiguration<IdentityRoleClaim<Guid>>
{
    public void Configure(EntityTypeBuilder<IdentityRoleClaim<Guid>> builder) => builder.ToTable("asp_net_role_claims");
}
