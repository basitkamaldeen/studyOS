-- CreateTable
CREATE TABLE "RevisionPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetExam" TEXT,
    "examDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RevisionPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RevisionTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RevisionTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RevisionPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "duration" INTEGER,
    "type" TEXT NOT NULL,
    "itemsStudied" INTEGER,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RevisionPlan_userId_idx" ON "RevisionPlan"("userId");

-- CreateIndex
CREATE INDEX "RevisionPlan_isActive_idx" ON "RevisionPlan"("isActive");

-- CreateIndex
CREATE INDEX "RevisionPlan_examDate_idx" ON "RevisionPlan"("examDate");

-- CreateIndex
CREATE INDEX "RevisionTask_planId_idx" ON "RevisionTask"("planId");

-- CreateIndex
CREATE INDEX "RevisionTask_dueDate_idx" ON "RevisionTask"("dueDate");

-- CreateIndex
CREATE INDEX "RevisionTask_completed_idx" ON "RevisionTask"("completed");

-- CreateIndex
CREATE INDEX "StudySession_userId_idx" ON "StudySession"("userId");

-- CreateIndex
CREATE INDEX "StudySession_userId_startTime_idx" ON "StudySession"("userId", "startTime");

-- CreateIndex
CREATE INDEX "StudySession_type_idx" ON "StudySession"("type");
