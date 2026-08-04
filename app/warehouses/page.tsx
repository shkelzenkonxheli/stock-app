import { redirect } from "next/navigation";
import { ConfirmActionForm } from "@/app/components/confirm-action-form";
import { FlashMessage } from "@/app/components/flash-message";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const metadata = {
  title: "Depot",
};

type WarehousesPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
    edit?: string;
  }>;
};

async function createWarehouse(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN"]);

  const name = formData.get("name")?.toString().trim();

  if (!name) {
    redirect("/warehouses?error=validation");
  }

  const existing = await prisma.warehouse.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (existing) {
    redirect("/warehouses?error=exists");
  }

  await prisma.warehouse.create({
    data: {
      name,
      active: true,
      isDefault: false,
    },
  });

  redirect("/warehouses?success=created");
}

async function renameWarehouse(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN"]);

  const warehouseId = Number(formData.get("warehouseId"));
  const name = formData.get("name")?.toString().trim();

  if (!warehouseId || !name) {
    redirect(`/warehouses?error=validation&edit=${warehouseId || ""}`);
  }

  const current = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!current) {
    redirect("/warehouses?error=notfound");
  }

  const duplicate = await prisma.warehouse.findFirst({
    where: {
      id: {
        not: warehouseId,
      },
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (duplicate) {
    redirect(`/warehouses?error=exists&edit=${warehouseId}`);
  }

  await prisma.warehouse.update({
    where: { id: warehouseId },
    data: {
      name,
    },
  });

  redirect("/warehouses?success=renamed");
}

function getMessage(error?: string, success?: string) {
  if (error === "validation") {
    return {
      type: "error" as const,
      text: "Shkruaj emrin e depos para ruajtjes.",
    };
  }

  if (error === "exists") {
    return {
      type: "error" as const,
      text: "Ekziston tashme nje depo me kete emer.",
    };
  }

  if (error === "notfound") {
    return {
      type: "error" as const,
      text: "Depoja nuk u gjet.",
    };
  }

  if (success === "created") {
    return {
      type: "success" as const,
      text: "Depoja u shtua me sukses.",
    };
  }

  if (success === "renamed") {
    return {
      type: "success" as const,
      text: "Emri i depos u perditesua me sukses.",
    };
  }

  return null;
}

export default async function WarehousesPage({
  searchParams,
}: WarehousesPageProps) {
  await requireRole(["SUPER_ADMIN"]);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const message = getMessage(
    resolvedSearchParams?.error?.trim(),
    resolvedSearchParams?.success?.trim(),
  );
  const editId = Number(resolvedSearchParams?.edit) || null;

  const warehouses = await prisma.warehouse.findMany({
    orderBy: [{ isDefault: "desc" }, { active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      active: true,
      isDefault: true,
      _count: {
        select: {
          stockLevels: true,
          orders: true,
          outgoingTransfers: true,
          incomingTransfers: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,transparent_20%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Warehouses
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Menaxho depot
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Shto depo te reja dhe ndrysho emrin e depove ekzistuese pa prekur
            stokun, porosite ose transferet ekzistuese.
          </p>

          {message ? (
            <FlashMessage
              type={message.type}
              text={message.text}
              className="mt-6 rounded-2xl px-4 py-3 text-sm"
            />
          ) : null}

          <form action={createWarehouse} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-800"
              >
                Emri i depos se re
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                placeholder="p.sh. Depo Kryesore"
              />
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
            >
              + Shto depon
            </button>
          </form>
        </section>

        <section className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Lista aktuale
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Depot ne sistem
              </h2>
            </div>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Home
            </a>
          </div>

          <div className="mt-6 space-y-4">
            {warehouses.map((warehouse) => {
              const isEditing = editId === warehouse.id;
              const usageCount =
                warehouse._count.stockLevels +
                warehouse._count.orders +
                warehouse._count.outgoingTransfers +
                warehouse._count.incomingTransfers;

              return (
                <article
                  key={warehouse.id}
                  className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-950">
                          {warehouse.name}
                        </h3>
                        {warehouse.isDefault ? (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            Default
                          </span>
                        ) : null}
                        {!warehouse.active ? (
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            Joaktive
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                          {warehouse._count.stockLevels} rreshta stoku
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                          {warehouse._count.orders} porosi
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                          {warehouse._count.outgoingTransfers +
                            warehouse._count.incomingTransfers}{" "}
                          transfere
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                          {usageCount} perdorime gjithsej
                        </span>
                      </div>
                    </div>

                    {!isEditing ? (
                      <a
                        href={`/warehouses?edit=${warehouse.id}`}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        Ndrysho emrin
                      </a>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <form action={renameWarehouse} className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <input type="hidden" name="warehouseId" value={warehouse.id} />
                      <input
                        name="name"
                        type="text"
                        defaultValue={warehouse.name}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Ruaj
                        </button>
                        <a
                          href="/warehouses"
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          Anulo
                        </a>
                      </div>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
