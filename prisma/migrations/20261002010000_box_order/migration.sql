ALTER TABLE "Box" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "ownerId" ORDER BY "createdAt" DESC, "id" ASC) - 1 AS pos
  FROM "Box"
)
UPDATE "Box" SET "position" = ranked.pos FROM ranked WHERE "Box"."id" = ranked."id";
