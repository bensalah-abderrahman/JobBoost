-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER',
ADD COLUMN "canCollect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canSendEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "credits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "disabledAt" TIMESTAMP(3);

-- Le compte propriétaire existant devient administrateur.
UPDATE "User" SET "role" = 'ADMIN'
WHERE "id" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
