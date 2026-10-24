-- AlterTable: store one-time imported public GitHub profile metadata.
ALTER TABLE "User"
ADD COLUMN "githubCompany" TEXT,
ADD COLUMN "githubBlog" TEXT,
ADD COLUMN "githubLocation" TEXT,
ADD COLUMN "githubPublicRepos" INTEGER,
ADD COLUMN "githubPublicGists" INTEGER,
ADD COLUMN "githubFollowers" INTEGER,
ADD COLUMN "githubFollowing" INTEGER,
ADD COLUMN "githubCreatedAt" TIMESTAMP(3),
ADD COLUMN "githubUpdatedAt" TIMESTAMP(3),
ADD COLUMN "githubProfileImportedAt" TIMESTAMP(3);
