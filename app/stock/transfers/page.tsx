import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FlashMessage } from "@/app/components/flash-message";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWarehouses } from "@/lib/warehouses";
import { TransferStockForm } from "./transfer-stock-form";

export const metadata = {
  title: "Transfer Stoku",
};

type TransferStockPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

async function createTransfer(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN", "WAREHOUSE"]);

  const productId = Number(formData.get("productId"));
  const fromWarehouseId = Number(formData.get("fromWarehouseId"));
  const toWarehouseId = Number(formData.get("toWarehouseId"));
  const note = formData.get("note")?.toString().trim() || null;
  const transfersRaw = formData.get("transfers")?.toString();

  if (!productId || !fromWarehouseId || !toWarehouseId || !transfersRaw) {
    redirect("/stock/transfers?error=validation");
  }

  if (fromWarehouseId === toWarehouseId) {
    redirect("/stock/transfers?error=sameWarehouse");
  }

  let parsedTransfers: unknown;

  try {
    parsedTransfers = JSON.parse(transfersRaw);
  } catch {
    redirect("/stock/transfers?error=validation");
  }

  if (!Array.isArray(parsedTransfers) || parsedTransfers.length === 0) {
    redirect("/stock/transfers?error=validation");
  }

  const transfers = parsedTransfers
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as { variantId?: unknown; quantity?: unknown };
      const variantId = Number(candidate.variantId);
      const quantity = Number(candidate.quantity);

      if (!variantId || !quantity || quantity <= 0) {
        return null;
      }

      return { variantId, quantity };
    })
    .filter(
      (item): item is { variantId: number; quantity: number } => item !== null,
    );

  if (transfers.length === 0) {
    redirect("/stock/transfers?error=validation");
  }

  const result = await prisma.$transaction(async (tx) => {
    const [fromWarehouse, toWarehouse] = await Promise.all([
      tx.warehouse.findUnique({
        where: { id: fromWarehouseId },
        select: { id: true, active: true },
      }),
      tx.warehouse.findUnique({
        where: { id: toWarehouseId },
        select: { id: true, active: true },
      }),
    ]);

    if (!fromWarehouse?.active || !toWarehouse?.active) {
      return { ok: false as const, reason: "warehouse" };
    }

    const variants = await tx.variant.findMany({
      where: {
        productId,
        id: {
          in: transfers.map((item) => item.variantId),
        },
      },
      select: {
        id: true,
      },
    });

    if (variants.length !== transfers.length) {
      return { ok: false as const, reason: "variant" };
    }

    const sourceLevels = await tx.stockLevel.findMany({
      where: {
        variantId: {
          in: transfers.map((item) => item.variantId),
        },
        warehouseId: fromWarehouseId,
      },
      select: {
        variantId: true,
        quantity: true,
      },
    });

    const sourceMap = new Map(
      sourceLevels.map((level) => [level.variantId, level.quantity]),
    );

    for (const transfer of transfers) {
      const available = sourceMap.get(transfer.variantId) ?? 0;
      if (available < transfer.quantity) {
        return { ok: false as const, reason: "insufficient" };
      }
    }

    for (const transfer of transfers) {
      await tx.stockLevel.update({
        where: {
          variantId_warehouseId: {
            variantId: transfer.variantId,
            warehouseId: fromWarehouseId,
          },
        },
        data: {
          quantity: {
            decrement: transfer.quantity,
          },
        },
      });

      await tx.stockLevel.upsert({
        where: {
          variantId_warehouseId: {
            variantId: transfer.variantId,
            warehouseId: toWarehouseId,
          },
        },
        update: {
          quantity: {
            increment: transfer.quantity,
          },
        },
        create: {
          variantId: transfer.variantId,
          warehouseId: toWarehouseId,
          quantity: transfer.quantity,
        },
      });

      await tx.stockTransfer.create({
        data: {
          variantId: transfer.variantId,
          fromWarehouseId,
          toWarehouseId,
          quantity: transfer.quantity,
          note,
        },
      });
    }

    return { ok: true as const };
  });

  if (!result.ok) {
    if (result.reason === "sameWarehouse") {
      redirect("/stock/transfers?error=sameWarehouse");
    }
    if (result.reason === "insufficient") {
      redirect("/stock/transfers?error=insufficient");
    }
    redirect("/stock/transfers?error=variant");
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/stock/incoming");
  revalidatePath("/stock/transfers");

  redirect("/stock/transfers?success=1");
}

function getMessage(error?: string, success?: string) {
  if (error === "validation") {
    return {
      type: "error" as const,
      text: "Zgjedh depot, produktin dhe vendos sasi per te pakten nje variant.",
    };
  }

  if (error === "sameWarehouse") {
    return {
      type: "error" as const,
      text: "Depoja burim dhe depoja destinacion duhet te jene te ndryshme.",
    };
  }

  if (error === "insufficient") {
    return {
      type: "error" as const,
      text: "Nuk ka stok te mjaftueshem ne depon burim per nje nga variantet.",
    };
  }

  if (error === "variant") {
    return {
      type: "error" as const,
      text: "Nje nga variantet ose depot nuk u gjet. Rifresko faqen dhe provo perseri.",
    };
  }

  if (success === "1") {
    return {
      type: "success" as const,
      text: "Transferi i stokut u ruajt me sukses.",
    };
  }

  return null;
}

export default async function TransferStockPage({
  searchParams,
}: TransferStockPageProps) {
  await requireRole(["SUPER_ADMIN", "WAREHOUSE"]);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const message = getMessage(
    resolvedSearchParams?.error,
    resolvedSearchParams?.success,
  );

  const [products, warehouses, recentTransfers] = await Promise.all([
    prisma.product.findMany({
      where: {
        variants: {
          some: {},
        },
      },
      select: {
        id: true,
        brand: true,
        name: true,
        variants: {
          where: {
            active: true,
          },
          select: {
            imagePath: true,
          },
          take: 1,
        },
      },
      orderBy: [{ name: "asc" }, { brand: "asc" }],
    }),
    getActiveWarehouses(),
    prisma.stockTransfer.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        quantity: true,
        note: true,
        createdAt: true,
        fromWarehouse: {
          select: { name: true },
        },
        toWarehouse: {
          select: { name: true },
        },
        variant: {
          select: {
            size: true,
            color: true,
            product: {
              select: {
                name: true,
                brand: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const dateTimeFormatter = new Intl.DateTimeFormat("sq-AL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Stock Transfer
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Transfer stoku
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Levize stokun nga nje depo ne tjetren pa ndryshuar totalin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Home
            </Link>
            <Link
              href="/stock/incoming"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Hyrje stoku
            </Link>
          </div>
        </div>

        {message ? (
          <FlashMessage
            type={message.type}
            text={message.text}
            className="mt-6 rounded-2xl px-4 py-3 text-sm shadow-sm"
          />
        ) : null}

        <TransferStockForm
          action={createTransfer}
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            brand: product.brand,
            imagePath: product.variants[0]?.imagePath ?? null,
          }))}
          warehouses={warehouses.map((warehouse) => ({
            id: warehouse.id,
            name: warehouse.name,
          }))}
        />

        <section className="mt-10">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Historia e transfereve
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
                  {recentTransfers.length} levizje
                </span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition group-open:rotate-180">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      d="m6 9 6 6 6-6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </summary>

            {recentTransfers.length === 0 ? (
              <div className="mt-5 rounded-[28px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <p className="text-base font-medium text-slate-900">
                  Nuk ka ende histori transferesh
                </p>
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50 text-left">
                      <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <th className="px-4 py-3.5">Produkti</th>
                        <th className="px-4 py-3.5">Varianti</th>
                        <th className="px-4 py-3.5">Levizia</th>
                        <th className="px-4 py-3.5 text-right">Sasia</th>
                        <th className="px-4 py-3.5">Shenimi</th>
                        <th className="px-4 py-3.5 text-right">Koha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {recentTransfers.map((transfer) => (
                        <tr key={transfer.id}>
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-medium text-slate-900">
                                {transfer.variant.product.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {transfer.variant.product.brand}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            Nr {transfer.variant.size} / {transfer.variant.color}
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            {transfer.fromWarehouse.name} → {transfer.toWarehouse.name}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="font-semibold text-blue-600">
                              {transfer.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {transfer.note || "-"}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600">
                            {dateTimeFormatter.format(transfer.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </details>
        </section>
      </section>
    </main>
  );
}
