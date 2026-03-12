import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VariantRowsForm } from "./variant-rows-form";

type NewProductVariantPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function createVariants(formData: FormData) {
  "use server";

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
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Shto variante
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {product.name} - {product.brand}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
            >
              Home
            </Link>
            <Link
              href={`/products/${product.id}`}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
            >
              Kthehu
            </Link>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Ketu shton variante reale me rreshta: p.sh. 41 / Red / 20 / 89.99,
          pastaj shton rreshtin tjeter me +.
        </div>

        <VariantRowsForm productId={product.id} action={createVariants} />
      </div>
    </main>
  );
}
