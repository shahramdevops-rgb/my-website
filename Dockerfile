# syntax=docker/dockerfile:1

# ---------- Build stage: full SDK, thrown away after publish ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0-noble AS build
WORKDIR /src

# Restore first, from project/props files only: this layer stays cached until a dependency changes,
# so editing C# code doesn't re-download every NuGet package.
COPY global.json Directory.Build.props Directory.Packages.props .editorconfig ./
COPY src/PersonalSite.Domain/PersonalSite.Domain.csproj                 src/PersonalSite.Domain/
COPY src/PersonalSite.Application/PersonalSite.Application.csproj       src/PersonalSite.Application/
COPY src/PersonalSite.Infrastructure/PersonalSite.Infrastructure.csproj src/PersonalSite.Infrastructure/
COPY src/PersonalSite.Api/PersonalSite.Api.csproj                       src/PersonalSite.Api/
RUN dotnet restore src/PersonalSite.Api/PersonalSite.Api.csproj

COPY src/ src/
# OpenApiGenerateDocuments=false: the contract (openapi/v1.json) is generated and checked in CI, not in the image.
RUN dotnet publish src/PersonalSite.Api/PersonalSite.Api.csproj \
    --configuration Release --no-restore --output /app/publish -p:UseAppHost=false -p:OpenApiGenerateDocuments=false

# Mount points for the named volumes (compose.prod.yaml: uploads, dpkeys). Created here because the runtime image
# has no shell; copied with the app user as owner, so Docker initialises a new empty volume writable by the app.
RUN mkdir -p /app/data/uploads /app/data/dp-keys

# ---------- Runtime stage: small, no shell, non-root ----------
# "chiseled" = Ubuntu with only what .NET needs; "extra" adds ICU + tzdata (Persian calendar, Asia/Tehran).
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled-extra AS runtime
WORKDIR /app
COPY --from=build /app/publish .
COPY --from=build --chown=$APP_UID:$APP_UID /app/data /app/data

# Chiseled images already default to the non-root "app" user; stated explicitly so it can't silently change.
USER $APP_UID
EXPOSE 8080

# No curl in this image: the app probes its own /health (see HealthProbe.cs).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["dotnet", "PersonalSite.Api.dll", "--healthcheck"]

ENTRYPOINT ["dotnet", "PersonalSite.Api.dll"]
