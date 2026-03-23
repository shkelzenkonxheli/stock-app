import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FlashMessage } from "@/app/components/flash-message";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IncomingStockForm } from "./incoming-stock-form";

type IncomingStockPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

async function createIncomingStock(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN"]);

  const productId = Number(formData.get("productId"));
  const reason =
    formData.get("reason")?.toString() === "CUSTOMER_RETURN"
      ? "CUSTOMER_RETURN"
      : "INCOMING_STOCK";
  const adjustmentsRaw = formData.get("adjustments")?.toString();

  if (!productId || !adjustmentsRaw) {
    redirect("/stock/incoming?error=validation");
  }

  let parsedAdjustments: unknown;

  try {
    parsedAdjustments = JSON.parse(adjustmentsRaw);
  } catch {
    redirect("/stock/incoming?error=validation");
  }

  if (!Array.isArray(parsedAdjustments) || parsedAdjustments.length === 0) {
    redirect("/stock/incoming?error=validation");
  }

  const adjustments = parsedAdjustments
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

      return {
        variantId,
        quantity,
      };
    })
    .filter(
      (item): item is { variantId: number; quantity: number } => item !== null,
    );

  if (adjustments.length === 0) {
    redirect("/stock/incoming?error=validation");
  }

  const result = await prisma.$transaction(async (tx) => {
    const variants = await tx.variant.findMany({
      where: {
        productId,
        id: {
          in: adjustments.map((item) => item.variantId),
        },
      },
      select: {
        id: true,
      },
    });

    if (variants.length !== adjustments.length) {
      return { ok: false as const };
    }

    for (const adjustment of adjustments) {
      await tx.variant.update({
        where: { id: adjustment.variantId },
        data: {
          stock: {
            increment: adjustment.quantity,
          },
        },
      });
    }

    await tx.stockMovement.createMany({
      data: adjustments.map((adjustment) => ({
        variantId: adjustment.variantId,
        quantity: adjustment.quantity,
        reason,
      })),
    });

    return { ok: true as const };
  });

  if (!result.ok) {
    redirect("/stock/incoming?error=variant");
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/orders/new");
  revalidatePath("/orders/quick");
  revalidatePath("/stock/incoming");

  redirect("/stock/incoming?success=1");
}

function getMessage(error?: string, success?: string) {
  if (error === "validation") {
    return {
      type: "error" as const,
      text: "Zgjedh produktin dhe vendos sasi per te pakten nje variant.",
    };
  }

  if (error === "variant") {
    return {
      type: "error" as const,
      text: "Nje nga variantet nuk u gjet me. Rifresko faqen dhe provo perseri.",
    };
  }

  if (success === "1") {
    return {
      type: "success" as const,
      text: "Hyrja e stokut u ruajt me sukses.",
    };
  }

  return null;
}

const reasonLabels: Record<"INCOMING_STOCK" | "CUSTOMER_RETURN", string> = {
  INCOMING_STOCK: "Hyrje stoku",
  CUSTOMER_RETURN: "Kthim klienti",
};

const reasonStyles: Record<"INCOMING_STOCK" | "CUSTOMER_RETURN", string> = {
  INCOMING_STOCK: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CUSTOMER_RETURN: "border-sky-200 bg-sky-50 text-sky-700",
};

export default async function IncomingStockPage({
  searchParams,
}: IncomingStockPageProps) {
  await requireRole(["SUPER_ADMIN"]);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const message = getMessage(
    resolvedSearchParams?.error,
    resolvedSearchParams?.success,
  );

  const [products, recentMovements] = await Promise.all([
    prisma.product.findMany({
      where: {
        variants: {
          some: {},
        },
      },
      select: {
        id: true,
        name: true,
        brand: true,
      },
      orderBy: [{ name: "asc" }, { brand: "asc" }],
    }),
    prisma.stockMovement.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        quantity: true,
        reason: true,
        createdAt: true,
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dcfce7_0%,transparent_20%),radial-gradient(circle_at_top_right,#dbeafe_0%,transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-7xl rounded-[32px] border border-slate-200/80 bg-white/95 px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Incoming Stock
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Hyrje stoku
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Zgjedh produktin dhe shto stok per disa variante njeheresh.
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
              href="/products"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Shiko produktet
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

        <IncomingStockForm
          action={createIncomingStock}
          products={products.map((product) => ({
            id: product.id,
            label: `${product.name} | ${product.brand}`,
          }))}
        />

        <section className="mt-8">
          <details className="group rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Historia e hyrjeve
                </h2>
                <p className="text-sm text-slate-600">
                  Hap vetem nese don me i pa 20 levizjet e fundit.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                  {recentMovements.length} levizje
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition group-open:rotate-180">
                  ˅
                </span>
              </div>
            </summary>

            {recentMovements.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                <p className="text-base font-medium text-slate-900">
                  Nuk ka ende histori te hyrjeve
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <th className="px-4 py-3.5">Produkti</th>
                        <th className="px-4 py-3.5">Varianti</th>
                        <th className="px-4 py-3.5">Arsyeja</th>
                        <th className="px-4 py-3.5 text-right">Sasia</th>
                        <th className="px-4 py-3.5 text-right">Koha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {recentMovements.map((movement) => (
                        <tr key={movement.id}>
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-medium text-slate-900">
                                {movement.variant.product.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {movement.variant.product.brand}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            Nr {movement.variant.size} / {movement.variant.color}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${reasonStyles[movement.reason]}`}
                            >
                              {reasonLabels[movement.reason]}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="font-semibold text-slate-900">
                              +{movement.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600">
                            {dateTimeFormatter.format(movement.createdAt)}
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
