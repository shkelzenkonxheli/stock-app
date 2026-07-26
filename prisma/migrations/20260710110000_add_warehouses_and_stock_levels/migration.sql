-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN "warehouseId" INTEGER;

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLevel" (
    "id" SERIAL NOT NULL,
    "variantId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" SERIAL NOT NULL,
    "variantId" INTEGER NOT NULL,
    "fromWarehouseId" INTEGER NOT NULL,
    "toWarehouseId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_name_key" ON "Warehouse"("name");

-- CreateIndex
CREATE INDEX "Warehouse_active_idx" ON "Warehouse"("active");

-- CreateIndex
CREATE INDEX "Warehouse_isDefault_idx" ON "Warehouse"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "StockLevel_variantId_warehouseId_key" ON "StockLevel"("variantId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockLevel_warehouseId_idx" ON "StockLevel"("warehouseId");

-- CreateIndex
CREATE INDEX "StockLevel_variantId_idx" ON "StockLevel"("variantId");

-- CreateIndex
CREATE INDEX "StockTransfer_variantId_idx" ON "StockTransfer"("variantId");

-- CreateIndex
CREATE INDEX "StockTransfer_fromWarehouseId_idx" ON "StockTransfer"("fromWarehouseId");

-- CreateIndex
CREATE INDEX "StockTransfer_toWarehouseId_idx" ON "StockTransfer"("toWarehouseId");

-- CreateIndex
CREATE INDEX "StockTransfer_createdAt_idx" ON "StockTransfer"("createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_warehouseId_idx" ON "StockMovement"("warehouseId");

-- Seed default warehouses
INSERT INTO "Warehouse" ("name", "isDefault", "active", "createdAt", "updatedAt")
VALUES
  ('Depo 1', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Depo 2', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Move all existing stock into the default warehouse (Depo 1)
INSERT INTO "StockLevel" ("variantId", "warehouseId", "quantity", "createdAt", "updatedAt")
SELECT
  v."id",
  w."id",
  v."stock",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Variant" v
CROSS JOIN "Warehouse" w
WHERE w."name" = 'Depo 1'
ON CONFLICT ("variantId", "warehouseId") DO NOTHING;

-- Attach existing stock movement history to the default warehouse
UPDATE "StockMovement" sm
SET "warehouseId" = w."id"
FROM "Warehouse" w
WHERE sm."warehouseId" IS NULL
  AND w."name" = 'Depo 1';

-- AddForeignKey
ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel"
ADD CONSTRAINT "StockLevel_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "Variant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel"
ADD CONSTRAINT "StockLevel_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer"
ADD CONSTRAINT "StockTransfer_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "Variant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer"
ADD CONSTRAINT "StockTransfer_fromWarehouseId_fkey"
FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer"
ADD CONSTRAINT "StockTransfer_toWarehouseId_fkey"
FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
