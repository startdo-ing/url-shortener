CREATE INDEX `idx_audit_logs_resource` ON `audit_logs` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_click_events_link_time` ON `click_events` (`short_link_id`,`occurred_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_short_links_lookup` ON `short_links` (`domain_id`,`slug`);--> statement-breakpoint
CREATE INDEX `idx_short_links_status` ON `short_links` (`status`);--> statement-breakpoint
CREATE INDEX `idx_short_links_expires_at` ON `short_links` (`expires_at`);