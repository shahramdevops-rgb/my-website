using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PersonalSite.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectsAndMediaFiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "media_files",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    storage_key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    original_file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    content_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    width = table.Column<int>(type: "integer", nullable: true),
                    height = table.Column<int>(type: "integer", nullable: true),
                    alt_text = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_media_files", x => x.id);
                    table.CheckConstraint("ck_media_files_dimensions", "(width IS NULL AND height IS NULL) OR (width > 0 AND height > 0)");
                    table.CheckConstraint("ck_media_files_size_bytes", "size_bytes > 0");
                });

            migrationBuilder.CreateTable(
                name: "projects",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    language = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    translation_group = table.Column<Guid>(type: "uuid", nullable: false),
                    slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    summary = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    body_markdown = table.Column<string>(type: "text", nullable: false),
                    body_html = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    live_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    source_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    health_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    demo_key = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    tech_stack = table.Column<string[]>(type: "character varying(40)[]", nullable: false),
                    cover_image_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_featured = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    started_on = table.Column<DateOnly>(type: "date", nullable: true),
                    finished_on = table.Column<DateOnly>(type: "date", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_projects", x => x.id);
                    table.CheckConstraint("ck_projects_archived_not_featured", "NOT (is_featured AND status = 'Archived')");
                    table.CheckConstraint("ck_projects_period", "finished_on IS NULL OR started_on IS NULL OR started_on <= finished_on");
                    table.CheckConstraint("ck_projects_sort_order", "sort_order >= 0");
                    table.ForeignKey(
                        name: "fk_projects_media_files_cover_image_id",
                        column: x => x.cover_image_id,
                        principalTable: "media_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_media_files_storage_key",
                table: "media_files",
                column: "storage_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_projects_cover_image_id",
                table: "projects",
                column: "cover_image_id");

            migrationBuilder.CreateIndex(
                name: "ix_projects_language_slug",
                table: "projects",
                columns: new[] { "language", "slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_projects_language_sort_order",
                table: "projects",
                columns: new[] { "language", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "ix_projects_translation_group_language",
                table: "projects",
                columns: new[] { "translation_group", "language" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "projects");

            migrationBuilder.DropTable(
                name: "media_files");
        }
    }
}
