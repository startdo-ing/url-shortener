PRAGMA foreign_keys = OFF;

CREATE TABLE `domains_new` (
	`id` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`verification_status` text DEFAULT 'pending' NOT NULL CHECK (`verification_status` IN ('pending', 'verified', 'failed')),
	`verification_error` text,
	`verification_checked_at` text,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `domains_new` (
	`id`,
	`host`,
	`is_active`,
	`is_primary`,
	`created_by`,
	`created_at`,
	`updated_at`,
	`verification_status`,
	`verification_error`,
	`verification_checked_at`
)
SELECT
	`id`,
	`host`,
	`is_active`,
	`is_primary`,
	`created_by`,
	`created_at`,
	`updated_at`,
	'pending',
	NULL,
	NULL
FROM `domains`;

DROP TABLE `domains`;
ALTER TABLE `domains_new` RENAME TO `domains`;
CREATE UNIQUE INDEX `domains_host_unique` ON `domains` (`host`);

PRAGMA foreign_keys = ON;