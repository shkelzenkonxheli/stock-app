import Link from "next/link";
import { revalidatePath } from "next/cache";
import { hasRole, requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderDetailsModal } from "./order-details-modal";

const statusStyles: Record<string, string> = {
  NEW: "bg-amber-50 text-amber-700 border-amber-200",
  READY: "bg-sky-50 text-sky-700 border-sky-200",
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELED: "bg-rose-50 text-rose-700 border-rose-200",
};

const sourceStyles: Record<string, string> = {
  INSTAGRAM: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  STORE: "bg-blue-50 text-blue-700 border-blue-200",
  WHOLESALE: "bg-orange-50 text-orange-700 border-orange-200",
};

const sourceLabels: Record<string, string> = {
  INSTAGRAM: "Instagram",
  STORE: "Shitore",
  WHOLESALE: "Shumice",
};

async function updateOrderStatus(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN", "WAREHOUSE"]);

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
        items: true,
      },
    });

    if (!order) {
      return;
    }

    if (order.status === nextStatus) {
      return;
    }

    if (nextStatus === "CANCELED" && order.status !== "CANCELED") {
      if (order.items.length > 0) {
        for (const item of order.items) {
          await tx.variant.update({
            where: { id: item.variantId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      } else if (order.variantId && order.quantity) {
        await tx.variant.update({
          where: { id: order.variantId },
          data: {
            stock: {
              increment: order.quantity,
            },
          },
        });
      }
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
  const currentUser = await requireUser();
  const canCreateOrders = hasRole(currentUser, ["SUPER_ADMIN", "SELLER"]);
  const canManageStatuses = hasRole(currentUser, ["SUPER_ADMIN", "WAREHOUSE"]);

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
      items: {
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ecfeff_0%,transparent_18%),radial-gradient(circle_at_top_right,#fef3c7_0%,transparent_22%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px]  bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 px-5 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Te gjitha porosite
              </h1>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              {canCreateOrders ? (
                <Link
                  href="/orders/new"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
                >
                  + Shto Porosi
                </Link>
              ) : null}
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
            <>
              <div className="grid gap-4 p-4 sm:p-5 xl:hidden">
                {orders.map((order) => {
                  const orderItems =
                    order.items.length > 0
                      ? order.items.map((item) => ({
                          id: item.id,
                          name: item.variant.product.name,
                          brand: item.variant.product.brand,
                          size: item.variant.size,
                          color: item.variant.color,
                          quantity: item.quantity,
                        }))
                      : order.variant
                        ? [
                            {
                              id: order.id,
                              name: order.variant.product.name,
                              brand: order.variant.product.brand,
                              size: order.variant.size,
                              color: order.variant.color,
                              quantity: order.quantity ?? 0,
                            },
                          ]
                        : [];

                  const totalQuantity = orderItems.reduce(
                    (sum, item) => sum + item.quantity,
                    0,
                  );

                  return (
                    <article
                      key={order.id}
                      className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-semibold text-slate-950">
                            {order.customerName}
                          </h2>
                          <p className="mt-1 text-sm text-slate-600">{order.phone}</p>
                        </div>
                        <span
                          className={`inline-flex rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusStyles[order.status]}`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Artikuj
                          </p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">
                            {orderItems.length}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">
                            Cope
                          </p>
                          <p className="mt-1 text-lg font-semibold text-emerald-700">
                            {totalQuantity}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${sourceStyles[order.source]}`}
                        >
                          {sourceLabels[order.source]}
                        </span>
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                          {order.instagram || "Pa reference"}
                        </span>
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                          {new Intl.DateTimeFormat("sq-AL", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }).format(order.createdAt)}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <OrderDetailsModal
                          orderId={order.id}
                          customerName={order.customerName}
                          phone={order.phone}
                          sourceLabel={sourceLabels[order.source]}
                          reference={order.instagram}
                          notes={order.notes}
                          items={orderItems.map((item) => ({
                            id: item.id,
                            name: item.name,
                            brand: item.brand,
                            size: item.size,
                            color: item.color,
                            quantity: item.quantity,
                          }))}
                        />
                        {canManageStatuses ? (
                          <div className="grid grid-cols-2 gap-2">
                            {order.status === "NEW" ? (
                              <>
                                <form action={updateOrderStatus}>
                                  <input type="hidden" name="orderId" value={order.id} />
                                  <input type="hidden" name="nextStatus" value="READY" />
                                  <button
                                    type="submit"
                                    className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                                  >
                                    Ready
                                  </button>
                                </form>
                                <form action={updateOrderStatus}>
                                  <input type="hidden" name="orderId" value={order.id} />
                                  <input type="hidden" name="nextStatus" value="CANCELED" />
                                  <button
                                    type="submit"
                                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
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
                                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                                  >
                                    Done
                                  </button>
                                </form>
                                <form action={updateOrderStatus}>
                                  <input type="hidden" name="orderId" value={order.id} />
                                  <input type="hidden" name="nextStatus" value="CANCELED" />
                                  <button
                                    type="submit"
                                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                                  >
                                    Cancel
                                  </button>
                                </form>
                              </>
                            ) : null}
                            {order.status === "DONE" ? (
                              <span className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Mbyllur
                              </span>
                            ) : null}
                            {order.status === "CANCELED" ? (
                              <span className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                E anuluar
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto xl:block">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50/90 text-left">
                  <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-5 py-4">Klienti</th>
                    <th className="px-5 py-4 text-center">Artikuj</th>
                    <th className="px-5 py-4 text-center">Cope</th>
                    <th className="px-5 py-4 text-center">Burimi</th>
                    <th className="px-5 py-4">Referenca</th>
                    <th className="px-5 py-4 text-center">Statusi</th>
                    <th className="px-5 py-4 text-right">Data</th>
                    <th className="px-5 py-4 text-right">Porosia</th>
                    {canManageStatuses ? (
                      <th className="px-5 py-4 text-right">Veprime</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {orders.map((order) => {
                    const orderItems =
                      order.items.length > 0
                        ? order.items.map((item) => ({
                            id: item.id,
                            name: item.variant.product.name,
                            brand: item.variant.product.brand,
                            size: item.variant.size,
                            color: item.variant.color,
                            quantity: item.quantity,
                          }))
                        : order.variant
                          ? [
                              {
                                id: order.id,
                                name: order.variant.product.name,
                                brand: order.variant.product.brand,
                                size: order.variant.size,
                                color: order.variant.color,
                                quantity: order.quantity ?? 0,
                              },
                            ]
                          : [];

                    const totalQuantity = orderItems.reduce(
                      (sum, item) => sum + item.quantity,
                      0,
                    );

                    return (
                        <tr
                          key={order.id}
                          className="align-top transition hover:bg-cyan-50/30"
                        >
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-semibold text-slate-950">
                                {order.customerName}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {order.phone}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex min-w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
                              {orderItems.length}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex min-w-12 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">
                              {totalQuantity}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span
                              className={`inline-flex rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${sourceStyles[order.source]}`}
                            >
                              {sourceLabels[order.source]}
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
                          <td className="px-5 py-4 text-right">
                            <OrderDetailsModal
                              orderId={order.id}
                              customerName={order.customerName}
                              phone={order.phone}
                              sourceLabel={sourceLabels[order.source]}
                              reference={order.instagram}
                              notes={order.notes}
                              items={orderItems.map((item) => ({
                                id: item.id,
                                name: item.name,
                                brand: item.brand,
                                size: item.size,
                                color: item.color,
                                quantity: item.quantity,
                              }))}
                            />
                          </td>
                          {canManageStatuses ? (
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                {order.status === "NEW" ? (
                                  <>
                                    <form action={updateOrderStatus}>
                                      <input type="hidden" name="orderId" value={order.id} />
                                      <input type="hidden" name="nextStatus" value="READY" />
                                      <button
                                        type="submit"
                                        className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                                      >
                                        Ready
                                      </button>
                                    </form>
                                    <form action={updateOrderStatus}>
                                      <input type="hidden" name="orderId" value={order.id} />
                                      <input
                                        type="hidden"
                                        name="nextStatus"
                                        value="CANCELED"
                                      />
                                      <button
                                        type="submit"
                                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
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
                                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                                      >
                                        Done
                                      </button>
                                    </form>
                                    <form action={updateOrderStatus}>
                                      <input type="hidden" name="orderId" value={order.id} />
                                      <input
                                        type="hidden"
                                        name="nextStatus"
                                        value="CANCELED"
                                      />
                                      <button
                                        type="submit"
                                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
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
                          ) : null}
                        </tr>
                      
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
