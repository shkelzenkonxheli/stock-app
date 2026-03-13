import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderForm } from "./order-form";

type NewOrderPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

async function createOrder(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN", "SELLER"]);

  const source = formData.get("source")?.toString() as
    | "INSTAGRAM"
    | "STORE"
    | "WHOLESALE"
    | undefined;
  const itemsRaw = formData.get("items")?.toString();
  const customerName = formData.get("customerName")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim();
  const instagram = formData.get("instagram")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim();

  if (!source || !itemsRaw || !customerName || !phone) {
    redirect("/orders/new?error=validation");
  }

  let parsedItems: unknown;

  try {
    parsedItems = JSON.parse(itemsRaw);
  } catch {
    redirect("/orders/new?error=validation");
  }

  if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
    redirect("/orders/new?error=validation");
  }

  const items = parsedItems
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as { variantId?: unknown; quantity?: unknown };
      const variantId = Number(candidate.variantId);
      const quantity = Number(candidate.quantity);

      if (!variantId || Number.isNaN(quantity) || quantity <= 0) {
        return null;
      }

      return { variantId, quantity };
    })
    .filter(
      (item): item is { variantId: number; quantity: number } => item !== null,
    );

  if (items.length === 0) {
    redirect("/orders/new?error=validation");
  }

  const result = await prisma.$transaction(async (tx) => {
    const variants = await tx.variant.findMany({
      where: {
        id: {
          in: items.map((item) => item.variantId),
        },
      },
    });

    if (variants.length !== items.length) {
      return { ok: false as const, reason: "variant" };
    }

    const variantsById = new Map(
      variants.map((variant) => [variant.id, variant]),
    );

    for (const item of items) {
      const variant = variantsById.get(item.variantId);

      if (!variant) {
        return { ok: false as const, reason: "variant" };
      }

      if (variant.stock < item.quantity) {
        return { ok: false as const, reason: "stock" };
      }
    }

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const primaryVariantId = items[0]?.variantId;

    const order = await tx.order.create({
      data: {
        customerName,
        phone,
        instagram: instagram || null,
        source,
        notes: notes || null,
        quantity: totalQuantity,
        variantId: primaryVariantId,
      },
    });

    await tx.orderItem.createMany({
      data: items.map((item) => ({
        orderId: order.id,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    });

    for (const item of items) {
      await tx.variant.update({
        where: { id: item.variantId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    return {
      ok: true as const,
      orderId: order.id,
      productIds: [...new Set(variants.map((variant) => variant.productId))],
    };
  });

  if (!result.ok) {
    redirect(`/orders/new?error=${result.reason}`);
  }

  revalidatePath("/");
  revalidatePath("/products");
  for (const productId of result.productIds) {
    revalidatePath(`/products/${productId}`);
  }
  revalidatePath("/orders");
  revalidatePath("/orders/new");

  redirect("/orders");
}

function getErrorMessage(error?: string) {
  switch (error) {
    case "stock":
      return "Nuk ka stok te mjaftueshem per kete variant.";
    case "variant":
      return "Varianti i zgjedhur nuk ekziston me.";
    case "validation":
      return "Ploteso fushat kryesore para se te ruash porosine.";
    default:
      return null;
  }
}

export default async function NewOrderPage({
  searchParams,
}: NewOrderPageProps) {
  await requireRole(["SUPER_ADMIN", "SELLER"]);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = getErrorMessage(resolvedSearchParams?.error);

  const variants = await prisma.variant.findMany({
    where: {
      stock: {
        gt: 0,
      },
    },
    include: {
      product: true,
    },
    orderBy: [{ product: { name: "asc" } }, { size: "asc" }, { color: "asc" }],
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ecfccb_0%,transparent_20%),radial-gradient(circle_at_top_right,#dbeafe_0%,transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-4xl rounded-[32px] border border-slate-200/80 bg-white/95 px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Order Entry
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Shto porosi
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Home
            </Link>
            <Link
              href="/orders"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Shiko porosite
            </Link>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 shadow-sm">
            {errorMessage}
          </div>
        ) : null}

        <OrderForm
          action={createOrder}
          variants={variants.map((variant) => ({
            id: variant.id,
            productId: variant.productId,
            productLabel: `${variant.product.name} | ${variant.product.brand}`,
            size: variant.size,
            color: variant.color,
            stock: variant.stock,
            price: Number(variant.price),
          }))}
        />
      </section>
    </main>
  );
}
