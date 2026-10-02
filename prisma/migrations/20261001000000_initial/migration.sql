CREATE SCHEMA IF NOT EXISTS "public";
CREATE TYPE "GuestPermission" AS ENUM ('VIEW', 'EDIT', 'PRIVATE');
CREATE TYPE "ActorType" AS ENUM ('OWNER', 'GUEST');
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'READY', 'FAILED');
CREATE TABLE "User" (
 "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT, "email" TEXT, "emailVerified" TIMESTAMP(3), "image" TEXT,
 "driveRootFolderId" TEXT, "drivePhotosFolderId" TEXT, "driveStatus" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Account" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "provider" TEXT NOT NULL,
 "providerAccountId" TEXT NOT NULL, "refresh_token" TEXT, "access_token" TEXT, "expires_at" INTEGER,
 "token_type" TEXT, "scope" TEXT, "id_token" TEXT, "session_state" TEXT
);
CREATE TABLE "Session" ("id" TEXT NOT NULL PRIMARY KEY, "sessionToken" TEXT NOT NULL, "userId" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL);
CREATE TABLE "VerificationToken" ("identifier" TEXT NOT NULL, "token" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL);
CREATE TABLE "Box" (
 "id" TEXT NOT NULL PRIMARY KEY, "ownerId" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '',
 "publicToken" TEXT NOT NULL, "guestPermission" "GuestPermission" NOT NULL DEFAULT 'VIEW',
 "nextItemNumber" INTEGER NOT NULL DEFAULT 1, "version" INTEGER NOT NULL DEFAULT 1, "deletedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Item" (
 "id" TEXT NOT NULL PRIMARY KEY, "boxId" TEXT NOT NULL, "number" INTEGER NOT NULL, "name" TEXT NOT NULL,
 "description" TEXT NOT NULL DEFAULT '', "photoId" TEXT, "createdByUserId" TEXT, "createdByActorType" "ActorType" NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1, "deletedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Media" (
 "id" TEXT NOT NULL PRIMARY KEY, "boxId" TEXT NOT NULL, "driveFileId" TEXT, "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
 "filename" TEXT NOT NULL, "bytes" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Activity" (
 "id" TEXT NOT NULL PRIMARY KEY, "boxId" TEXT NOT NULL, "itemId" TEXT, "action" TEXT NOT NULL, "actorType" "ActorType" NOT NULL,
 "actorUserId" TEXT, "itemName" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "RateBucket" ("key" TEXT NOT NULL PRIMARY KEY, "count" INTEGER NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE UNIQUE INDEX "Box_publicToken_key" ON "Box"("publicToken");
CREATE INDEX "Box_ownerId_deletedAt_createdAt_idx" ON "Box"("ownerId", "deletedAt", "createdAt");
CREATE UNIQUE INDEX "Item_photoId_key" ON "Item"("photoId");
CREATE INDEX "Item_boxId_deletedAt_createdAt_idx" ON "Item"("boxId", "deletedAt", "createdAt");
CREATE UNIQUE INDEX "Item_boxId_number_key" ON "Item"("boxId", "number");
CREATE UNIQUE INDEX "Media_driveFileId_key" ON "Media"("driveFileId");
CREATE INDEX "Media_status_createdAt_idx" ON "Media"("status", "createdAt");
CREATE INDEX "Activity_boxId_createdAt_idx" ON "Activity"("boxId", "createdAt");
CREATE INDEX "RateBucket_expiresAt_idx" ON "RateBucket"("expiresAt");
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Box" ADD CONSTRAINT "Box_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Item" ADD CONSTRAINT "Item_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "Box"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Item" ADD CONSTRAINT "Item_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Media" ADD CONSTRAINT "Media_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "Box"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "Box"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
