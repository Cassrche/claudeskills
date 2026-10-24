-- AlterTable: make public profiles the database default
ALTER TABLE "User" ALTER COLUMN "isProfilePublic" SET DEFAULT true;

-- Backfill existing accounts to match the new product default.
UPDATE "User"
SET "isProfilePublic" = true
WHERE "isProfilePublic" = false;

-- Backfill profile URLs from GitHub usernames where the normalized value is valid and unique.
WITH candidates AS (
  SELECT
    "id",
    lower("githubUsername") AS "username"
  FROM "User"
  WHERE
    "username" IS NULL
    AND "githubUsername" IS NOT NULL
    AND lower("githubUsername") ~ '^[a-z0-9][a-z0-9-]{0,38}$'
    AND lower("githubUsername") NOT LIKE '%-'
    AND lower("githubUsername") NOT LIKE '%--%'
),
unique_candidates AS (
  SELECT candidates."id", candidates."username"
  FROM candidates
  WHERE
    NOT EXISTS (
      SELECT 1
      FROM "User" existing
      WHERE existing."username" = candidates."username"
    )
    AND NOT EXISTS (
      SELECT 1
      FROM candidates duplicate
      WHERE duplicate."username" = candidates."username" AND duplicate."id" <> candidates."id"
    )
)
UPDATE "User"
SET "username" = unique_candidates."username"
FROM unique_candidates
WHERE "User"."id" = unique_candidates."id";
