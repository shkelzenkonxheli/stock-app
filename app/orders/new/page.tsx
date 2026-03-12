import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type NewOrderPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

async function createOrder(formData: FormData) {
  "use server";

  const variantId = Number(formData.get("variantId"));
  const customerName = formData.get("customerName")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim();
  const instagram = formData.get("instagram")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim();
  const quantity = Number(formData.get("quantity"));

  if (!variantId || !customerName || !phone || Number.isNaN(quantity) || quantity <= 0) {
    redirect("/orders/new?error=validation");
  }

  const result = await prisma.$transaction(async (tx) => {
    const variant = await tx.variant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
      },
    });

    if (!variant) {
      return { ok: false as const, reason: "variant" };
    }

    if (variant.stock < quantity) {
      return { ok: false as const, reason: "stock" };
    }

    const order = await tx.order.create({
      data: {
        customerName,
        phone,
        instagram: instagram || null,
        notes: notes || null,
        quantity,
        variantId,
      },
    });

    await tx.variant.update({
      where: { id: variantId },
      data: {
        stock: {
          decrement: quantity,
        },
      },
    });

    return { ok: true as const, orderId: order.id, productId: variant.productId };
  });

  if (!result.ok) {
    redirect(`/orders/new?error=${result.reason}`);
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${result.productId}`);
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[32px] border border-slate-200/80 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Order Entry
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Shto porosi
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Regjistro porosite nga Instagrami dhe ul stokun automatikisht per
                variantin e zgjedhur.
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
                href="/orders"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Shiko porosite
              </Link>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <form action={createOrder} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="variantId"
                className="block text-sm font-medium text-slate-800"
              >
                Varianti
              </label>
              <select
                id="variantId"
                name="variantId"
                defaultValue=""
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
              >
                <option value="" disabled>
                  Zgjedh variantin
                </option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.product.name} | {variant.product.brand} | Nr {variant.size} |{" "}
                    {variant.color} | stok {variant.stock} | {Number(variant.price).toFixed(2)} EUR
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="customerName"
                  className="block text-sm font-medium text-slate-800"
                >
                  Emri i klientit
                </label>
                <input
                  id="customerName"
                  name="customerName"
                  type="text"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                  placeholder="p.sh. Ardit Krasniqi"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-slate-800"
                >
                  Telefoni
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                  placeholder="p.sh. 044123456"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_180px]">
              <div className="space-y-2">
                <label
                  htmlFor="instagram"
                  className="block text-sm font-medium text-slate-800"
                >
                  Instagram
                </label>
                <input
                  id="instagram"
                  name="instagram"
                  type="text"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                  placeholder="p.sh. @klienti"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="quantity"
                  className="block text-sm font-medium text-slate-800"
                >
                  Sasia
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  defaultValue="1"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-slate-800"
              >
                Shenime
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                placeholder="Adresa, komente shtese, menyra e dorezimit..."
              />
            </div>

            <div className="flex flex-col gap-3 pt-3 sm:flex-row">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
              >
                Ruaj porosine
              </button>
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Shiko produktet
              </Link>
            </div>
          </form>
        </section>

        <aside className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
          <div className="rounded-[28px] bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Kontrolli i stokut
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
              Cfare ben sistemi
            </h2>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-900">1. Zgjedh variantin</p>
                <p className="mt-1 text-sm text-slate-600">
                  Zgjedh modelin, numrin dhe ngjyren qe eshte ne stok.
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-900">2. Ruhet porosia</p>
                <p className="mt-1 text-sm text-slate-600">
                  Krijohet porosia me statusin fillestar `NEW`.
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-900">3. Ulet stoku</p>
                <p className="mt-1 text-sm text-slate-600">
                  Sasia zbritet automatikisht vetem nese ka stok te mjaftueshem.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
