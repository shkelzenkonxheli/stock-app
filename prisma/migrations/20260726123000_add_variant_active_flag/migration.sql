ALTER TABLE "Variant"
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Variant_active_idx" ON "Variant"("active");
