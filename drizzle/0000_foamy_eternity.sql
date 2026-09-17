CREATE TABLE `rate_limits` (
	`owner` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`owner`, `day`)
);
--> statement-breakpoint
CREATE TABLE `transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`language` text NOT NULL,
	`text` text NOT NULL,
	`original` text NOT NULL,
	`created_at` text NOT NULL,
	`duration` real DEFAULT 0 NOT NULL,
	`source` text NOT NULL,
	`audio_key` text,
	`mime` text
);
--> statement-breakpoint
CREATE INDEX `idx_transcripts_owner_created` ON `transcripts` (`owner`,`created_at`);