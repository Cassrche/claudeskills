-- CreateTable
CREATE TABLE "RuleFeedback" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuleFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RuleFeedback_ruleId_idx" ON "RuleFeedback"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "RuleFeedback_userId_ruleId_key" ON "RuleFeedback"("userId", "ruleId");

-- AddForeignKey
ALTER TABLE "RuleFeedback" ADD CONSTRAINT "RuleFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
