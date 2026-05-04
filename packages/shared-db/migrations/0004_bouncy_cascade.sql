PRAGMA foreign_keys = OFF;

CREATE TABLE `users_new` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`keycloak_sub` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL CHECK (`role` IN ('admin', 'member')),
	`is_active` integer DEFAULT true NOT NULL
);

INSERT INTO `users_new` (
	`id`,
	`email`,
	`display_name`,
	`created_at`,
	`updated_at`,
	`keycloak_sub`,
	`role`,
	`is_active`
)
SELECT
	`id`,
	`email`,
	`display_name`,
	`created_at`,
	`updated_at`,
	`keycloak_sub`,
	`role`,
	`is_active`
FROM `users`;

DROP TABLE `users`;
ALTER TABLE `users_new` RENAME TO `users`;
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
CREATE UNIQUE INDEX `users_keycloak_sub_unique` ON `users` (`keycloak_sub`);

CREATE TABLE `short_links_new` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`slug` text NOT NULL,
	`target_url` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL CHECK (`status` IN ('active', 'disabled')),
	`http_code` integer DEFAULT 302 NOT NULL CHECK (`http_code` IN (301, 302, 307)),
	`expires_at` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`password_hash` text,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `short_links_new` (
	`id`,
	`domain_id`,
	`slug`,
	`target_url`,
	`status`,
	`http_code`,
	`expires_at`,
	`created_by`,
	`created_at`,
	`updated_at`,
	`password_hash`
)
SELECT
	`id`,
	`domain_id`,
	`slug`,
	`target_url`,
	`status`,
	`http_code`,
	`expires_at`,
	`created_by`,
	`created_at`,
	`updated_at`,
	`password_hash`
FROM `short_links`;

DROP TABLE `short_links`;
ALTER TABLE `short_links_new` RENAME TO `short_links`;
CREATE UNIQUE INDEX `idx_short_links_lookup` ON `short_links` (`domain_id`, `slug`);
CREATE INDEX `idx_short_links_status` ON `short_links` (`status`);
CREATE INDEX `idx_short_links_expires_at` ON `short_links` (`expires_at`);

DROP INDEX IF EXISTS `idx_click_events_link_time`;
CREATE INDEX `idx_click_events_link_time` ON `click_events` (`short_link_id`, `occurred_at` DESC);

PRAGMA foreign_keys = ON;
