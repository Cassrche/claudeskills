-- AlterTable
ALTER TABLE "UserChecklist" ADD COLUMN "publicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UserChecklist_publicId_key" ON "UserChecklist"("publicId");
