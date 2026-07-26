"use client";

import dynamic from "next/dynamic";
import type { ProductStockQuickViewProps } from "./product-stock-quick-view";

const ProductStockQuickView = dynamic(
  () =>
    import("./product-stock-quick-view").then(
      (module) => module.ProductStockQuickView,
    ),
  { ssr: false },
);

export function ProductStockQuickViewClient(
  props: ProductStockQuickViewProps,
) {
  return <ProductStockQuickView {...props} />;
}
