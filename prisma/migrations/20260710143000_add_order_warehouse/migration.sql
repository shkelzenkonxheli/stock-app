ALTER TABLE "Order"
ADD COLUMN "warehouseId" INTEGER;

CREATE INDEX "Order_warehouseId_idx" ON "Order"("warehouseId");

ALTER TABLE "Order"
ADD CONSTRAINT "Order_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
