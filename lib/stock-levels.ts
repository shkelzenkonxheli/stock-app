type StockLevelLike = {
  warehouseId: number;
  quantity: number;
};

export function resolveWarehouseStock(
  stockLevels: StockLevelLike[] | undefined,
  fallbackStock: number,
  warehouseId?: number | null,
) {
  if (!warehouseId) {
    return fallbackStock;
  }

  const match = stockLevels?.find((level) => level.warehouseId === warehouseId);
  return match?.quantity ?? 0;
}
