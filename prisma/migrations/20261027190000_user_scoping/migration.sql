-- Vérification email et identité sur User.
ALTER TABLE "User" ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "verifyTokenHash" TEXT,
ADD COLUMN "verifyTokenExpires" TIMESTAMP(3);

-- Les comptes existants (créés avant la vérification) sont considérés comme vérifiés.
UPDATE "User" SET "emailVerifiedAt" = CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "User_verifyTokenHash_key" ON "User"("verifyTokenHash");

-- Propriétaire de chaque donnée : rattache l'existant au plus ancien compte.
ALTER TABLE "CandidateProfile" ADD COLUMN "userId" TEXT;
UPDATE "CandidateProfile" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
ALTER TABLE "CandidateProfile" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "CandidateProfile" ALTER COLUMN "userId" SET DEFAULT '';
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Job" ADD COLUMN "userId" TEXT;
UPDATE "Job" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
ALTER TABLE "Job" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Job" ALTER COLUMN "userId" SET DEFAULT '';
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Resume" ADD COLUMN "userId" TEXT;
UPDATE "Resume" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
ALTER TABLE "Resume" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Resume" ALTER COLUMN "userId" SET DEFAULT '';
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoverLetter" ADD COLUMN "userId" TEXT;
UPDATE "CoverLetter" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
ALTER TABLE "CoverLetter" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "CoverLetter" ALTER COLUMN "userId" SET DEFAULT '';
ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Application" ADD COLUMN "userId" TEXT;
UPDATE "Application" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
ALTER TABLE "Application" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Application" ALTER COLUMN "userId" SET DEFAULT '';
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Un profil par utilisateur ; l'email du profil n'est plus unique.
DROP INDEX IF EXISTS "CandidateProfile_email_key";
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- Une offre est unique par utilisateur, source et identifiant externe.
DROP INDEX IF EXISTS "Job_source_externalId_key";
CREATE UNIQUE INDEX "Job_userId_source_externalId_key" ON "Job"("userId", "source", "externalId");

CREATE INDEX "Job_userId_idx" ON "Job"("userId");
CREATE INDEX "Resume_userId_idx" ON "Resume"("userId");
CREATE INDEX "CoverLetter_userId_idx" ON "CoverLetter"("userId");
CREATE INDEX "Application_userId_idx" ON "Application"("userId");
