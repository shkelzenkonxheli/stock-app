import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultWarehouse } from "@/lib/warehouses";

type StockUpdatePayload = {
  productId?: number;
  warehouseId?: number | null;
  reason?: string;
  updates?: Array<{
    variantId?: number;
    quantity?: number;
  }>;
};

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !hasRole(currentUser, ["SUPER_ADMIN", "WAREHOUSE"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: StockUpdatePayload;

  try {
    payload = (await request.json()) as StockUpdatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const productId = Number(payload.productId);
  const requestedWarehouseId = Number(payload.warehouseId);
  const reason =
    payload.reason === "CUSTOMER_RETURN" ? "CUSTOMER_RETURN" : "INCOMING_STOCK";
  const updates = (payload.updates ?? [])
    .map((item) => ({
      variantId: Number(item.variantId),
      quantity: Number(item.quantity),
    }))
    .filter(
      (item) =>
        Number.isInteger(item.variantId) &&
        item.variantId > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    );

  if (!Number.isInteger(productId) || productId <= 0 || updates.length === 0) {
    return NextResponse.json({ error: "Missing stock updates" }, { status: 400 });
  }

  const defaultWarehouse = await getDefaultWarehouse();
  const warehouseId =
    Number.isInteger(requestedWarehouseId) && requestedWarehouseId > 0
      ? requestedWarehouseId
      : defaultWarehouse?.id;

  if (!warehouseId) {
    return NextResponse.json({ error: "Warehouse not found" }, { status: 400 });
  }

  const variants = await prisma.variant.findMany({
    where: {
      id: {
        in: updates.map((item) => item.variantId),
      },
      productId,
    },
    select: {
      id: true,
      stock: true,
    },
  });

  if (variants.length !== updates.length) {
    return NextResponse.json({ error: "Some variants were not found" }, { status: 404 });
  }

  const variantMap = new Map(variants.map((variant) => [variant.id, variant.stock]));

  await prisma.$transaction(
    updates.flatMap((update) => {
      const currentStock = variantMap.get(update.variantId);

      if (currentStock === undefined) {
        return [];
      }

      return [
        prisma.variant.update({
          where: {
            id: update.variantId,
          },
          data: {
            stock: currentStock + update.quantity,
          },
        }),
        prisma.stockLevel.upsert({
          where: {
            variantId_warehouseId: {
              variantId: update.variantId,
              warehouseId,
            },
          },
          update: {
            quantity: {
              increment: update.quantity,
            },
          },
          create: {
            variantId: update.variantId,
            warehouseId,
            quantity: update.quantity,
          },
        }),
        prisma.stockMovement.create({
          data: {
            variantId: update.variantId,
            warehouseId,
            quantity: update.quantity,
            reason,
          },
        }),
      ];
    }),
  );

  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);

  return NextResponse.json({ ok: true });
}
