import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VariantRowsForm } from "./variant-rows-form";

type NewProductVariantPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function createVariants(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN"]);

  const productId = Number(formData.get("productId"));
  const rowsRaw = formData.get("rows")?.toString();

  if (!productId || !rowsRaw) {
    return;
  }

  let parsedRows: unknown;

  try {
    parsedRows = JSON.parse(rowsRaw);
  } catch {
    return;
  }

  if (!Array.isArray(parsedRows)) {
    return;
  }

  const normalizedRows = parsedRows
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const candidate = row as {
        size?: unknown;
        color?: unknown;
        stock?: unknown;
        price?: unknown;
      };

      const size = String(candidate.size ?? "").trim();
      const color = String(candidate.color ?? "").trim();
      const stock = Number(candidate.stock);
      const price = String(candidate.price ?? "").trim();

      if (!size || !color || Number.isNaN(stock) || stock < 0 || !price) {
        return null;
      }

      return {
        size,
        color,
        stock,
        price,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (normalizedRows.length === 0) {
    return;
  }

  const existingVariants = await prisma.variant.findMany({
    where: { productId },
    select: {
      size: true,
      color: true,
    },
  });

  const existingKeys = new Set(
    existingVariants.map(
      (variant) => `${variant.size}::${variant.color.toLowerCase()}`,
    ),
  );

  const uniqueRows = normalizedRows.filter((row, index, rows) => {
    const currentKey = `${row.size}::${row.color.toLowerCase()}`;
    const firstIndex = rows.findIndex(
      (candidate) =>
        `${candidate.size}::${candidate.color.toLowerCase()}` === currentKey,
    );

    return firstIndex === index && !existingKeys.has(currentKey);
  });

  if (uniqueRows.length > 0) {
    await prisma.variant.createMany({
      data: uniqueRows.map((row) => ({
        productId,
        size: row.size,
        color: row.color,
        stock: row.stock,
        price: row.price,
      })),
    });
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/orders/new");

  redirect(`/products/${productId}`);
}

export default async function NewProductVariantPage({
  params,
}: NewProductVariantPageProps) {
  await requireRole(["SUPER_ADMIN"]);

  const { id } = await params;
  const productId = Number(id);

  if (Number.isNaN(productId)) {
    notFound();
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fef3c7_0%,transparent_18%),radial-gradient(circle_at_top_right,#dbeafe_0%,transparent_22%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-[32px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Variant Setup
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Shto variante
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {product.name} - {product.brand}
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
              href={`/products/${product.id}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Kthehu
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900 shadow-sm">
          Ketu shton variante reale me rreshta: p.sh. 41 / Red / 20 / 89.99,
          pastaj shton rreshtin tjeter me +.
        </div>

        <VariantRowsForm productId={product.id} action={createVariants} />
      </div>
    </main>
  );
}
