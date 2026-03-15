import Link from "next/link";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { hasRole, requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrdersFilters } from "./orders-filters";
import { OrdersManager } from "./orders-manager";

const PAGE_SIZE = 20;

type OrdersPageProps = {
  searchParams?: Promise<{
    page?: string;
    q?: string;
    status?: string;
    source?: string;
  }>;
};

type OrderStatusValue = "NEW" | "READY" | "DONE" | "CANCELED";
type OrderSourceValue = "INSTAGRAM" | "STORE" | "WHOLESALE";

function buildOrdersPageHref(
  page: number,
  q: string,
  status: string,
  source: string,
) {
  const params = new URLSearchParams();
  params.set("page", String(page));

  if (q) {
    params.set("q", q);
  }
  if (status) {
    params.set("status", status);
  }
  if (source) {
    params.set("source", source);
  }

  return `/orders?${params.toString()}`;
}

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

async function deleteOrder(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN"]);

  const orderId = Number(formData.get("orderId"));

  if (!orderId) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        quantity: true,
        variantId: true,
        items: {
          select: {
            variantId: true,
            quantity: true,
          },
        },
      },
    });

    if (!order) {
      return;
    }

    if (order.status !== "CANCELED") {
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

    await tx.order.delete({
      where: { id: orderId },
    });
  });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/orders");
  revalidatePath("/orders/new");
}

async function bulkDeleteOrders(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN"]);

  const rawOrderIds = formData.get("orderIds")?.toString();

  if (!rawOrderIds) {
    return;
  }

  let parsedIds: unknown;

  try {
    parsedIds = JSON.parse(rawOrderIds);
  } catch {
    return;
  }

  if (!Array.isArray(parsedIds)) {
    return;
  }

  const orderIds = parsedIds
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (orderIds.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const orders = await tx.order.findMany({
      where: {
        id: {
          in: orderIds,
        },
      },
      select: {
        id: true,
        status: true,
        quantity: true,
        variantId: true,
        items: {
          select: {
            variantId: true,
            quantity: true,
          },
        },
      },
    });

    if (orders.length === 0) {
      return;
    }

    for (const order of orders) {
      if (order.status === "CANCELED") {
        continue;
      }

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

    await tx.order.deleteMany({
      where: {
        id: {
          in: orders.map((order) => order.id),
        },
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/orders");
  revalidatePath("/orders/new");
}

export default async function OrdersPage({
  searchParams,
}: OrdersPageProps) {
  const currentUser = await requireUser();
  const canCreateOrders = hasRole(currentUser, ["SUPER_ADMIN", "SELLER"]);
  const canManageStatuses = hasRole(currentUser, ["SUPER_ADMIN", "WAREHOUSE"]);
  const canDeleteOrders = hasRole(currentUser, ["SUPER_ADMIN"]);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const searchQuery = resolvedSearchParams?.q?.trim() || "";
  const rawStatus = resolvedSearchParams?.status?.trim() || "";
  const rawSource = resolvedSearchParams?.source?.trim() || "";
  const selectedStatus: OrderStatusValue | "" = [
    "NEW",
    "READY",
    "DONE",
    "CANCELED",
  ].includes(rawStatus)
    ? (rawStatus as OrderStatusValue)
    : "";
  const selectedSource: OrderSourceValue | "" = [
    "INSTAGRAM",
    "STORE",
    "WHOLESALE",
  ].includes(rawSource)
    ? (rawSource as OrderSourceValue)
    : "";
  const currentPage = Math.max(1, Number(resolvedSearchParams?.page) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;
  const where: Prisma.OrderWhereInput = {
    ...(searchQuery
      ? {
          OR: [
            {
              customerName: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
            {
              phone: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
            {
              instagram: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(selectedStatus
      ? {
          status: selectedStatus,
        }
      : {}),
    ...(selectedSource
      ? {
          source: selectedSource,
        }
      : {}),
  };

  const [orders, totalOrders] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        customerName: true,
        phone: true,
        instagram: true,
        source: true,
        notes: true,
        status: true,
        quantity: true,
        createdAt: true,
        variant: {
          select: {
            size: true,
            color: true,
            imagePath: true,
            product: {
              select: {
                name: true,
                brand: true,
              },
            },
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            variant: {
              select: {
                size: true,
                color: true,
                imagePath: true,
                product: {
                  select: {
                    name: true,
                    brand: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE));
  const previousPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;
  const dateFormatter = new Intl.DateTimeFormat("sq-AL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("sq-AL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const normalizedOrders = orders.map((order) => {
    const items =
      order.items.length > 0
        ? order.items.map((item) => ({
            id: item.id,
            name: item.variant.product.name,
            brand: item.variant.product.brand,
            size: item.variant.size,
            color: item.variant.color,
            imagePath: item.variant.imagePath,
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
                imagePath: order.variant.imagePath,
                quantity: order.quantity ?? 0,
              },
            ]
          : [];

    return {
      id: order.id,
      customerName: order.customerName,
      phone: order.phone,
      instagram: order.instagram,
      source: order.source,
      notes: order.notes,
      status: order.status,
      createdAtDateLabel: dateFormatter.format(order.createdAt),
      createdAtTimeLabel: timeFormatter.format(order.createdAt),
      itemsCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      deletable: true,
      items,
    };
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
          <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5">
            <OrdersFilters
              searchQuery={searchQuery}
              selectedStatus={selectedStatus}
              selectedSource={selectedSource}
            />
          </div>
          {orders.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-base font-medium text-slate-900">
                {searchQuery || selectedStatus || selectedSource
                  ? "Nuk u gjet asnje porosi me keto filtra"
                  : "Nuk ka ende porosi te regjistruara"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {searchQuery || selectedStatus || selectedSource
                  ? "Ndrysho filtrat ose bej reset per t'i pare te gjitha."
                  : "Shto porosine e pare per te filluar ndjekjen e shitjeve."}
              </p>
            </div>
          ) : (
            <>
              <OrdersManager
                orders={normalizedOrders}
                canManageStatuses={canManageStatuses}
                canDeleteOrders={canDeleteOrders}
                sourceLabels={sourceLabels}
                sourceStyles={sourceStyles}
                statusStyles={statusStyles}
                updateOrderStatusAction={updateOrderStatus}
                deleteOrderAction={deleteOrder}
                bulkDeleteOrdersAction={bulkDeleteOrders}
              />
            </>
          )}
        </section>

        {totalOrders > PAGE_SIZE ? (
          <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Faqja <span className="font-semibold text-slate-950">{currentPage}</span> nga{" "}
              <span className="font-semibold text-slate-950">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              {previousPage ? (
                <Link
                  href={buildOrdersPageHref(
                    previousPage,
                    searchQuery,
                    selectedStatus,
                    selectedSource,
                  )}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Mbrapa
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400">
                  Mbrapa
                </span>
              )}
              {nextPage ? (
                <Link
                  href={buildOrdersPageHref(
                    nextPage,
                    searchQuery,
                    selectedStatus,
                    selectedSource,
                  )}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Para
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400">
                  Para
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
