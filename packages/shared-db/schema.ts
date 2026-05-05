import {
	sqliteTable,
	text,
	integer,
	uniqueIndex,
	index,
	check
} from "drizzle-orm/sqlite-core"
import { sql, desc } from "drizzle-orm"

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`

export const users = sqliteTable(
	"users",
	{
		id: text("id").primaryKey(),
		keycloakSub: text("keycloak_sub").notNull().unique(),
		email: text("email").notNull().unique(),
		displayName: text("display_name"),
		role: text("role", { enum: ["admin", "member"] })
			.notNull()
			.default("member"),
		isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
		createdAt: text("created_at").notNull().default(now),
		updatedAt: text("updated_at").notNull().default(now)
	},
	(t) => [check("chk_users_role", sql`${t.role} in ('admin', 'member')`)]
)

export const domains = sqliteTable(
	"domains",
	{
		id: text("id").primaryKey(),
		host: text("host").notNull().unique(),
		isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
		isPrimary: integer("is_primary", { mode: "boolean" })
			.notNull()
			.default(false),
		createdBy: text("created_by")
			.notNull()
			.references(() => users.id),
		createdAt: text("created_at").notNull().default(now),
		updatedAt: text("updated_at").notNull().default(now),
		verificationStatus: text("verification_status", {
			enum: ["pending", "verified", "failed"]
		})
			.notNull()
			.default("pending"),
		verificationError: text("verification_error"),
		verificationCheckedAt: text("verification_checked_at")
	},
	(t) => [
		check(
			"chk_domains_verification_status",
			sql`${t.verificationStatus} in ('pending', 'verified', 'failed')`
		)
	]
)

export const shortLinks = sqliteTable(
	"short_links",
	{
		id: text("id").primaryKey(),
		domainId: text("domain_id")
			.notNull()
			.references(() => domains.id),
		slug: text("slug").notNull(),
		targetUrl: text("target_url").notNull(),
		passwordHash: text("password_hash"),
		status: text("status", { enum: ["active", "disabled"] })
			.notNull()
			.default("active"),
		httpCode: integer("http_code").notNull().default(302),
		expiresAt: text("expires_at"),
		createdBy: text("created_by")
			.notNull()
			.references(() => users.id),
		createdAt: text("created_at").notNull().default(now),
		updatedAt: text("updated_at").notNull().default(now)
	},
	(t) => [
		uniqueIndex("idx_short_links_lookup").on(t.domainId, t.slug),
		index("idx_short_links_status").on(t.status),
		index("idx_short_links_expires_at").on(t.expiresAt),
		check("chk_short_links_status", sql`${t.status} in ('active', 'disabled')`),
		check("chk_short_links_http_code", sql`${t.httpCode} in (301, 302, 307)`)
	]
)

export const clickEvents = sqliteTable(
	"click_events",
	{
		id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
		shortLinkId: text("short_link_id")
			.notNull()
			.references(() => shortLinks.id),
		requestHost: text("request_host").notNull(),
		requestPath: text("request_path").notNull(),
		referer: text("referer"),
		userAgent: text("user_agent"),
		ipHash: text("ip_hash"),
		countryCode: text("country_code"),
		occurredAt: text("occurred_at").notNull().default(now)
	},
	(t) => [
		index("idx_click_events_link_time").on(t.shortLinkId, desc(t.occurredAt))
	]
)

export const auditLogs = sqliteTable(
	"audit_logs",
	{
		id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
		actorUserId: text("actor_user_id").references(() => users.id),
		action: text("action").notNull(),
		resourceType: text("resource_type").notNull(),
		resourceId: text("resource_id").notNull(),
		metadata: text("metadata").notNull().default("{}"),
		createdAt: text("created_at").notNull().default(now)
	},
	(t) => [
		index("idx_audit_logs_resource").on(t.resourceType, t.resourceId),
		index("idx_audit_logs_created_at").on(t.createdAt)
	]
)
