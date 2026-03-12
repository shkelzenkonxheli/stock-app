import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const statusStyles: Record<string, string> = {
  NEW: "bg-amber-50 text-amber-700 border-amber-200",
  READY: "bg-sky-50 text-sky-700 border-sky-200",
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELED: "bg-rose-50 text-rose-700 border-rose-200",
};

async function updateOrderStatus(formData: FormData) {
  "use server";

  const orderId = Number(formData.get("orderId"));
  const nextStatus = formData.get("nextStatus")?.toString();

  if (!orderId || !nextStatus) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        variant: true,
      },
    });

    if (!order) {
      return;
    }

    if (order.status === nextStatus) {
      return;
    }

    if (nextStatus === "CANCELED" && order.status !== "CANCELED") {
      await tx.variant.update({
        where: { id: order.variantId },
        data: {
          stock: {
            increment: order.quantity,
          },
        },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus as "NEW" | "READY" | "DONE" | "CANCELED",
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/orders");
  revalidatePath("/orders/new");
}

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      variant: {
        include: {
          product: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 px-5 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Orders Overview
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Te gjitha porosite
              </h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Lista e porosive me klientin, variantin dhe statusin aktual.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Home
              </Link>
              <Link
                href="/orders/new"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
              >
                + Shto Porosi
              </Link>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.07)]">
          {orders.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-base font-medium text-slate-900">
                Nuk ka ende porosi te regjistruara
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Shto porosine e pare per te filluar ndjekjen e shitjeve.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-5 py-4">Klienti</th>
                    <th className="px-5 py-4">Varianti</th>
                    <th className="px-5 py-4 text-center">Sasia</th>
                    <th className="px-5 py-4">Instagram</th>
                    <th className="px-5 py-4 text-center">Statusi</th>
                    <th className="px-5 py-4 text-right">Data</th>
                    <th className="px-5 py-4 text-right">Veprime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="align-top transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {order.customerName}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{order.phone}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <p className="font-medium text-slate-900">
                          {order.variant.product.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Nr {order.variant.size} | {order.variant.color}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex min-w-12 items-center justify-center rounded-xl bg-slate-100 px-3 py-2 font-semibold text-slate-800">
                          {order.quantity}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {order.instagram || "-"}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${statusStyles[order.status]}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-slate-600">
                        {new Intl.DateTimeFormat("sq-AL", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }).format(order.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {order.status === "NEW" ? (
                            <>
                              <form action={updateOrderStatus}>
                                <input type="hidden" name="orderId" value={order.id} />
                                <input type="hidden" name="nextStatus" value="READY" />
                                <button
                                  type="submit"
                                  className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 transition hover:bg-sky-100"
                                >
                                  Ready
                                </button>
                              </form>
                              <form action={updateOrderStatus}>
                                <input type="hidden" name="orderId" value={order.id} />
                                <input type="hidden" name="nextStatus" value="CANCELED" />
                                <button
                                  type="submit"
                                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:bg-rose-100"
                                >
                                  Cancel
                                </button>
                              </form>
                            </>
                          ) : null}

                          {order.status === "READY" ? (
                            <>
                              <form action={updateOrderStatus}>
                                <input type="hidden" name="orderId" value={order.id} />
                                <input type="hidden" name="nextStatus" value="DONE" />
                                <button
                                  type="submit"
                                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 transition hover:bg-emerald-100"
                                >
                                  Done
                                </button>
                              </form>
                              <form action={updateOrderStatus}>
                                <input type="hidden" name="orderId" value={order.id} />
                                <input type="hidden" name="nextStatus" value="CANCELED" />
                                <button
                                  type="submit"
                                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:bg-rose-100"
                                >
                                  Cancel
                                </button>
                              </form>
                            </>
                          ) : null}

                          {order.status === "DONE" ? (
                            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Mbyllur
                            </span>
                          ) : null}

                          {order.status === "CANCELED" ? (
                            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                              E anuluar
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
