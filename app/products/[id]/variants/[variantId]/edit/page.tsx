import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type EditVariantPageProps = {
  params: Promise<{
    id: string;
    variantId: string;
  }>;
};

async function updateVariant(formData: FormData) {
  "use server";

  const productId = Number(formData.get("productId"));
  const variantId = Number(formData.get("variantId"));
  const size = formData.get("size")?.toString().trim();
  const color = formData.get("color")?.toString().trim();
  const stock = Number(formData.get("stock"));
  const price = formData.get("price")?.toString().trim();

  if (
    !productId ||
    !variantId ||
    !size ||
    !color ||
    Number.isNaN(stock) ||
    stock < 0 ||
    !price
  ) {
    return;
  }

  await prisma.variant.update({
    where: { id: variantId },
    data: {
      size,
      color,
      stock,
      price,
    },
  });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/orders/new");

  redirect(`/products/${productId}`);
}

export default async function EditVariantPage({
  params,
}: EditVariantPageProps) {
  const { id, variantId } = await params;
  const productId = Number(id);
  const parsedVariantId = Number(variantId);

  if (Number.isNaN(productId) || Number.isNaN(parsedVariantId)) {
    notFound();
  }

  const variant = await prisma.variant.findUnique({
    where: { id: parsedVariantId },
    include: {
      product: true,
    },
  });

  if (!variant || variant.productId !== productId) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200/80 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Variant Edit
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Edito variantin
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
              {variant.product.name} - {variant.product.brand}
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
              href={`/products/${productId}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Kthehu
            </Link>
          </div>
        </div>

        <form action={updateVariant} className="mt-8 space-y-5">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={variant.id} />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="size"
                className="block text-sm font-medium text-slate-800"
              >
                Numri
              </label>
              <input
                id="size"
                name="size"
                type="text"
                defaultValue={variant.size}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="color"
                className="block text-sm font-medium text-slate-800"
              >
                Ngjyra
              </label>
              <input
                id="color"
                name="color"
                type="text"
                defaultValue={variant.color}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="stock"
                className="block text-sm font-medium text-slate-800"
              >
                Stoku
              </label>
              <input
                id="stock"
                name="stock"
                type="number"
                min="0"
                defaultValue={variant.stock}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="price"
                className="block text-sm font-medium text-slate-800"
              >
                Cmimi
              </label>
              <input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={Number(variant.price).toFixed(2)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-3 sm:flex-row">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
            >
              Ruaj ndryshimet
            </button>
            <Link
              href={`/products/${productId}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Anulo
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
