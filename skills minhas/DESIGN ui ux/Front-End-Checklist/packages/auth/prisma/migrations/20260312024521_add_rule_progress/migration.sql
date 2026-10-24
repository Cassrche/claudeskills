-- CreateTable
CREATE TABLE "RuleProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "RuleProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RuleProgress_userId_idx" ON "RuleProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RuleProgress_userId_ruleId_key" ON "RuleProgress"("userId", "ruleId");

-- AddForeignKey
ALTER TABLE "RuleProgress" ADD CONSTRAINT "RuleProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
