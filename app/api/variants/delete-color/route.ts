import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !hasRole(currentUser, ["SUPER_ADMIN"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { productId?: number; color?: string };

  try {
    payload = (await request.json()) as { productId?: number; color?: string };
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const productId = Number(payload.productId);
  const color = String(payload.color ?? "").trim();

  if (!Number.isInteger(productId) || productId <= 0 || !color) {
    return NextResponse.json({ error: "Te dhenat nuk jane valide." }, { status: 400 });
  }

  const variants = await prisma.variant.findMany({
    where: {
      productId,
      active: true,
      color: {
        equals: color,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      productId: true,
    },
  });

  if (variants.length === 0) {
    return NextResponse.json({ error: "Ngjyra nuk u gjet." }, { status: 404 });
  }

  const variantIds = variants.map((variant) => variant.id);

  await prisma.$transaction(async (tx) => {
    await tx.variant.updateMany({
      where: {
        id: {
          in: variantIds,
        },
      },
      data: {
        active: false,
      },
    });
  });

  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);

  return NextResponse.json({
    ok: true,
    archivedVariantIds: variantIds,
  });
}
