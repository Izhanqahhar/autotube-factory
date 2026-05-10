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
    "modelId" TEXT NOT NULL DEFAULT 'us.anthropic.claude-sonnet-4-6',
    "modelProvider" TEXT NOT NULL DEFAULT 'bedrock',
    "modelUsed" TEXT,
    "researchModelId" TEXT,
    "scriptModelId" TEXT,
    "imagePromptModelId" TEXT,
    "exportToAirtable" BOOLEAN NOT NULL DEFAULT false,
    "exportToNotion" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_Project" ("audience", "createdAt", "currentStep", "duration", "errorMessage", "generationTimeMs", "id", "imagePromptModelId", "metadataJson", "modelId", "modelProvider", "modelUsed", "niche", "notes", "researchModelId", "scriptModelId", "sourceTopicId", "status", "style", "subtitleSrtPath", "subtitleVttPath", "thumbnailPath", "thumbnailUrl", "title", "tone", "totalCostUsd", "updatedAt") SELECT "audience", "createdAt", "currentStep", "duration", "errorMessage", "generationTimeMs", "id", "imagePromptModelId", "metadataJson", "modelId", "modelProvider", "modelUsed", "niche", "notes", "researchModelId", "scriptModelId", "sourceTopicId", "status", "style", "subtitleSrtPath", "subtitleVttPath", "thumbnailPath", "thumbnailUrl", "title", "tone", "totalCostUsd", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
