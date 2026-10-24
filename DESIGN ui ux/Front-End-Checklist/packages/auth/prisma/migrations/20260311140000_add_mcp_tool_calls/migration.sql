-- CreateTable
CREATE TABLE "McpToolCall" (
    "id" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "McpToolCall_toolName_idx" ON "McpToolCall"("toolName");

-- CreateIndex
CREATE INDEX "McpToolCall_createdAt_idx" ON "McpToolCall"("createdAt");
