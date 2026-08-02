import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWarehouseStock } from "@/lib/stock-levels";
import { getDefaultWarehouse } from "@/lib/warehouses";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !hasRole(currentUser, ["SUPER_ADMIN", "WAREHOUSE"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const productId = Number(id);
  const { searchParams } = new URL(request.url);
  const warehouseIdParam = searchParams.get("warehouseId");
  const warehouseId = warehouseIdParam ? Number(warehouseIdParam) : null;
  const defaultWarehouse = await getDefaultWarehouse();
  const defaultWarehouseId = defaultWarehouse?.id ?? null;

  if (Number.isNaN(productId) || productId <= 0) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  const variants = await prisma.variant.findMany({
    where: {
      productId,
    },
    select: {
      id: true,
      productId: true,
      size: true,
      color: true,
      imagePath: true,
      stock: true,
      ...(warehouseId
        ? {
            stockLevels: {
              where: { warehouseId },
              select: {
                warehouseId: true,
                quantity: true,
              },
            },
          }
        : {}),
      price: true,
      product: {
        select: {
          name: true,
          brand: true,
        },
      },
    },
    orderBy: [{ size: "asc" }, { color: "asc" }],
  });

  return NextResponse.json(
    variants.map((variant) => ({
      id: variant.id,
      productId: variant.productId,
      productLabel: `${variant.product.name} | ${variant.product.brand}`,
      size: variant.size,
      color: variant.color,
      imagePath: variant.imagePath,
      stock: resolveWarehouseStock(
        Array.isArray(variant.stockLevels) ? variant.stockLevels : undefined,
        variant.stock,
        warehouseId,
        defaultWarehouseId,
      ),
      price: Number(variant.price),
    })),
  );
}
