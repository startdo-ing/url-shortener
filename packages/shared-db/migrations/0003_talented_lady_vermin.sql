ALTER TABLE `users` ADD `keycloak_sub` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_keycloak_sub_unique` ON `users` (`keycloak_sub`);