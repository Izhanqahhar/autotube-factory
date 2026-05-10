-- AlterTable
ALTER TABLE "ImagePrompt" ADD COLUMN "generatedImagePath" TEXT;
ALTER TABLE "ImagePrompt" ADD COLUMN "generatedImageUrl" TEXT;
ALTER TABLE "ImagePrompt" ADD COLUMN "imageGeneratedAt" DATETIME;
ALTER TABLE "ImagePrompt" ADD COLUMN "imageSource" TEXT;

-- CreateTable
CREATE TABLE "GenerationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "costUsd" REAL NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GenerationLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "style" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "currentStep" TEXT NOT NULL DEFAULT 'idle',
    "errorMessage" TEXT,
    "modelId" TEXT NOT NULL DEFAULT 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    "modelProvider" TEXT NOT NULL DEFAULT 'bedrock',
    "modelUsed" TEXT,
    "sourceTopicId" TEXT,
    "thumbnailPath" TEXT,
    "thumbnailUrl" TEXT,
    "subtitleSrtPath" TEXT,
    "subtitleVttPath" TEXT,
    "metadataJson" TEXT,
    "totalCostUsd" REAL NOT NULL DEFAULT 0,
    "generationTimeMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Project" ("audience", "createdAt", "currentStep", "duration", "errorMessage", "id", "modelId", "modelProvider", "niche", "notes", "sourceTopicId", "status", "style", "title", "tone", "updatedAt") SELECT "audience", "createdAt", "currentStep", "duration", "errorMessage", "id", "modelId", "modelProvider", "niche", "notes", "sourceTopicId", "status", "style", "title", "tone", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
