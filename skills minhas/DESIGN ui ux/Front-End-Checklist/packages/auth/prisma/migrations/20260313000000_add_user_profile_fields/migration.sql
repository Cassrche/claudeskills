-- AlterTable
ALTER TABLE "User" ADD COLUMN     "username" TEXT,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "githubUrl" TEXT,
ADD COLUMN     "xUrl" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "isProfilePublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showProgress" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showChecklists" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
