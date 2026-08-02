type StockLevelLike = {
  warehouseId: number;
  quantity: number;
};

export function resolveWarehouseStock(
  stockLevels: StockLevelLike[] | undefined,
  fallbackStock: number,
  warehouseId?: number | null,
  defaultWarehouseId?: number | null,
) {
  if (!warehouseId) {
    return fallbackStock;
  }

  const match = stockLevels?.find((level) => level.warehouseId === warehouseId);

  if (match) {
    return match.quantity;
  }

  // Legacy fallback: variants created before warehouse stock-level rows existed
  // should still appear under the default warehouse.
  if (
    warehouseId === defaultWarehouseId &&
    (!stockLevels || stockLevels.length === 0) &&
    fallbackStock > 0
  ) {
    return fallbackStock;
  }

  return 0;
}
