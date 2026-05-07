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
DROP INDEX IF EXISTS `idx_click_events_link_time`;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_click_events_link_time` ON `click_events` (`short_link_id`,"occurred_at" desc);