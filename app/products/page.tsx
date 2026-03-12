import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      variants: true,
    },
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 px-5 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Inventory Overview
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Te gjitha patikat
              </h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Lista e modeleve me numrat, ngjyrat, stokun total dhe cmimin.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Home
              </Link>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-950">
                  {products.length}
                </span>{" "}
                modele ne sistem
              </div>
              <Link
                href="/products/new"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
              >
                + Shto Patike
              </Link>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.07)]">
          {products.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-base font-medium text-slate-900">
                Nuk ka ende produkte te regjistruara
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Shto modelin e pare dhe vazhdo me variantet per te filluar
                inventarin.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-5 py-4">Modeli</th>
                    <th className="px-5 py-4">Brendi</th>
                    <th className="px-5 py-4">Numrat</th>
                    <th className="px-5 py-4">Ngjyrat</th>
                    <th className="px-5 py-4 text-center">Variante</th>
                    <th className="px-5 py-4 text-center">Stoku</th>
                    <th className="px-5 py-4 text-right">Cmimi</th>
                    <th className="px-5 py-4 text-right">Veprime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {products.map((product) => {
                    const sizes = [
                      ...new Set(
                        product.variants.map((variant) => variant.size),
                      ),
                    ];
                    const colors = [
                      ...new Set(
                        product.variants.map((variant) => variant.color),
                      ),
                    ];
                    const totalStock = product.variants.reduce(
                      (sum, variant) => sum + variant.stock,
                      0,
                    );
                    const prices = product.variants.map((variant) =>
                      Number(variant.price),
                    );
                    const minPrice =
                      prices.length > 0 ? Math.min(...prices) : null;
                    const maxPrice =
                      prices.length > 0 ? Math.max(...prices) : null;

                    return (
                      <tr
                        key={product.id}
                        className="align-top transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-slate-950">
                              {product.name}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {product.brand}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {sizes.length > 0 ? sizes.join(", ") : "-"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {colors.length > 0 ? colors.join(", ") : "-"}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex min-w-12 items-center justify-center rounded-xl bg-slate-100 px-3 py-2 font-semibold text-slate-800">
                            {product.variants.length}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex min-w-14 items-center justify-center rounded-xl bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">
                            {totalStock}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-semibold tabular-nums text-slate-900">
                          {minPrice === null
                            ? "-"
                            : minPrice === maxPrice
                              ? `${minPrice.toFixed(2)} EUR`
                              : `${minPrice.toFixed(2)} - ${maxPrice?.toFixed(2)} EUR`}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/products/${product.id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                          >
                            Menaxho
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
