CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`token_prefix` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_by` text NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`last_used_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_api_tokens_hash` ON `api_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_api_tokens_created_by` ON `api_tokens` (`created_by`);--> statement-breakpoint
CREATE INDEX `idx_api_tokens_revoked_at` ON `api_tokens` (`revoked_at`);--> statement-breakpoint
DROP INDEX `idx_click_events_link_time`;--> statement-breakpoint
CREATE INDEX `idx_click_events_link_time` ON `click_events` (`short_link_id`,"occurred_at" desc);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_domains` (
	`id` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`verification_error` text,
	`verification_checked_at` text,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_domains_verification_status" CHECK("__new_domains"."verification_status" in ('pending', 'verified', 'failed'))
);
--> statement-breakpoint
INSERT INTO `__new_domains`("id", "host", "is_active", "is_primary", "created_by", "created_at", "updated_at", "verification_status", "verification_error", "verification_checked_at") SELECT "id", "host", "is_active", "is_primary", "created_by", "created_at", "updated_at", "verification_status", "verification_error", "verification_checked_at" FROM `domains`;--> statement-breakpoint
DROP TABLE `domains`;--> statement-breakpoint
ALTER TABLE `__new_domains` RENAME TO `domains`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `domains_host_unique` ON `domains` (`host`);--> statement-breakpoint
CREATE TABLE `__new_short_links` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`slug` text NOT NULL,
	`target_url` text NOT NULL,
	`password_hash` text,
	`status` text DEFAULT 'active' NOT NULL,
	`http_code` integer DEFAULT 302 NOT NULL,
	`expires_at` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_short_links_status" CHECK("__new_short_links"."status" in ('active', 'disabled')),
	CONSTRAINT "chk_short_links_http_code" CHECK("__new_short_links"."http_code" in (301, 302, 307))
);
--> statement-breakpoint
INSERT INTO `__new_short_links`("id", "domain_id", "slug", "target_url", "password_hash", "status", "http_code", "expires_at", "created_by", "created_at", "updated_at") SELECT "id", "domain_id", "slug", "target_url", "password_hash", "status", "http_code", "expires_at", "created_by", "created_at", "updated_at" FROM `short_links`;--> statement-breakpoint
DROP TABLE `short_links`;--> statement-breakpoint
ALTER TABLE `__new_short_links` RENAME TO `short_links`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_short_links_lookup` ON `short_links` (`domain_id`,`slug`);--> statement-breakpoint
CREATE INDEX `idx_short_links_status` ON `short_links` (`status`);--> statement-breakpoint
CREATE INDEX `idx_short_links_expires_at` ON `short_links` (`expires_at`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`keycloak_sub` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`role` text DEFAULT 'member' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "chk_users_role" CHECK("__new_users"."role" in ('admin', 'member'))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "keycloak_sub", "email", "display_name", "role", "is_active", "created_at", "updated_at") SELECT "id", "keycloak_sub", "email", "display_name", "role", "is_active", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_keycloak_sub_unique` ON `users` (`keycloak_sub`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);