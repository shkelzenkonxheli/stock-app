import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultWarehouse } from "@/lib/warehouses";

type SetStockPayload = {
  productId?: number;
  variantId?: number;
  warehouseId?: number | null;
  stock?: number;
};

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !hasRole(currentUser, ["SUPER_ADMIN", "WAREHOUSE"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: SetStockPayload;

  try {
    payload = (await request.json()) as SetStockPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const productId = Number(payload.productId);
  const variantId = Number(payload.variantId);
  const requestedWarehouseId = Number(payload.warehouseId);
  const stock = Number(payload.stock);

  if (
    !Number.isInteger(productId) ||
    productId <= 0 ||
    !Number.isInteger(variantId) ||
    variantId <= 0 ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    return NextResponse.json({ error: "Te dhenat nuk jane valide." }, { status: 400 });
  }

  const variant = await prisma.variant.findFirst({
    where: {
      id: variantId,
      productId,
    },
    select: {
      id: true,
    },
  });

  if (!variant) {
    return NextResponse.json({ error: "Varianti nuk u gjet." }, { status: 404 });
  }

  const defaultWarehouse = await getDefaultWarehouse();
  const warehouseId =
    Number.isInteger(requestedWarehouseId) && requestedWarehouseId > 0
      ? requestedWarehouseId
      : defaultWarehouse?.id;

  if (!warehouseId) {
    return NextResponse.json({ error: "Depoja nuk u gjet." }, { status: 400 });
  }

  const currentLevel = await prisma.stockLevel.findUnique({
    where: {
      variantId_warehouseId: {
        variantId,
        warehouseId,
      },
    },
    select: {
      quantity: true,
    },
  });

  const currentWarehouseStock = currentLevel?.quantity ?? 0;
  const delta = stock - currentWarehouseStock;

  await prisma.$transaction([
    prisma.variant.update({
      where: { id: variantId },
      data: {
        stock: {
          increment: delta,
        },
      },
    }),
    prisma.stockLevel.upsert({
      where: {
        variantId_warehouseId: {
          variantId,
          warehouseId,
        },
      },
      update: {
        quantity: stock,
      },
      create: {
        variantId,
        warehouseId,
        quantity: stock,
      },
    }),
  ]);

  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);

  return NextResponse.json({ ok: true, stock });
}
