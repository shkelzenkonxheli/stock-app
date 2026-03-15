"use client";

import { useMemo, useState } from "react";
import { ConfirmActionForm } from "@/app/components/confirm-action-form";
import { OrderDetailsModal } from "./order-details-modal";

type OrderStatusValue = "NEW" | "READY" | "DONE" | "CANCELED";
type OrderSourceValue = "INSTAGRAM" | "STORE" | "WHOLESALE";

type OrderItem = {
  id: number;
  name: string;
  brand: string;
  size: string;
  color: string;
  imagePath?: string | null;
  quantity: number;
};

type OrderSummary = {
  id: number;
  customerName: string;
  phone: string;
  instagram: string | null;
  source: OrderSourceValue;
  notes: string | null;
  status: OrderStatusValue;
  createdAtDateLabel: string;
  createdAtTimeLabel: string;
  itemsCount: number;
  totalQuantity: number;
  deletable: boolean;
  items: OrderItem[];
};

type OrdersManagerProps = {
  orders: OrderSummary[];
  canManageStatuses: boolean;
  canDeleteOrders: boolean;
  sourceLabels: Record<OrderSourceValue, string>;
  sourceStyles: Record<OrderSourceValue, string>;
  statusStyles: Record<OrderStatusValue, string>;
  updateOrderStatusAction: (formData: FormData) => void | Promise<void>;
  deleteOrderAction: (formData: FormData) => void | Promise<void>;
  bulkDeleteOrdersAction: (formData: FormData) => void | Promise<void>;
};

export function OrdersManager({
  orders,
  canManageStatuses,
  canDeleteOrders,
  sourceLabels,
  sourceStyles,
  statusStyles,
  updateOrderStatusAction,
  deleteOrderAction,
  bulkDeleteOrdersAction,
}: OrdersManagerProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const deletableOrderIds = useMemo(
    () => orders.map((order) => order.id),
    [orders],
  );

  const allSelected = useMemo(
    () =>
      deletableOrderIds.length > 0 &&
      selectedIds.length === deletableOrderIds.length,
    [deletableOrderIds, selectedIds.length],
  );

  const serializedSelectedIds = JSON.stringify(selectedIds);

  const toggleOne = (orderId: number) => {
    setSelectedIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : deletableOrderIds);
  };

  const renderActions = (order: OrderSummary) => (
    <div className="flex flex-wrap justify-end gap-2">
      <OrderDetailsModal
        orderId={order.id}
        customerName={order.customerName}
        phone={order.phone}
        sourceLabel={sourceLabels[order.source]}
        createdAtDateLabel={order.createdAtDateLabel}
        createdAtTimeLabel={order.createdAtTimeLabel}
        reference={order.instagram}
        notes={order.notes}
        items={order.items}
      />

      {canManageStatuses && order.status === "NEW" ? (
        <>
          <form action={updateOrderStatusAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="nextStatus" value="READY" />
            <button
              type="submit"
              className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
            >
              Ready
            </button>
          </form>
          <ConfirmActionForm
            action={updateOrderStatusAction}
            hiddenFields={[
              { name: "orderId", value: order.id },
              { name: "nextStatus", value: "CANCELED" },
            ]}
            confirmMessage="A je i sigurt qe don ta anulosh kete porosi?"
            buttonLabel="Cancel"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
          />
        </>
      ) : null}

      {canManageStatuses && order.status === "READY" ? (
        <>
          <form action={updateOrderStatusAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="nextStatus" value="DONE" />
            <button
              type="submit"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
            >
              Done
            </button>
          </form>
          <ConfirmActionForm
            action={updateOrderStatusAction}
            hiddenFields={[
              { name: "orderId", value: order.id },
              { name: "nextStatus", value: "CANCELED" },
            ]}
            confirmMessage="A je i sigurt qe don ta anulosh kete porosi?"
            buttonLabel="Cancel"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
          />
        </>
      ) : null}

      {canManageStatuses && order.status === "DONE" ? (
        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Mbyllur
        </span>
      ) : null}

      {canManageStatuses && order.status === "CANCELED" ? (
        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          E anuluar
        </span>
      ) : null}

      {canDeleteOrders ? (
        <ConfirmActionForm
          action={deleteOrderAction}
          hiddenFields={[{ name: "orderId", value: order.id }]}
          confirmMessage="A je i sigurt qe don ta fshish kete porosi? Ky veprim nuk kthehet mbrapa."
          buttonLabel="Fshi"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
        />
      ) : null}
    </div>
  );

  return (
    <div className="space-y-4">
      {canDeleteOrders && selectedIds.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Select all
          </label>

          <ConfirmActionForm
            action={bulkDeleteOrdersAction}
            hiddenFields={[{ name: "orderIds", value: serializedSelectedIds }]}
            confirmMessage="A je i sigurt qe don t'i fshish porosite e zgjedhura? Ky veprim nuk kthehet mbrapa."
            buttonLabel="Fshi te zgjedhurat"
            className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      ) : null}

      <div className="grid gap-4 p-4 sm:p-5 xl:hidden">
        {orders.map((order) => (
          <article
            key={order.id}
            className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {canDeleteOrders ? (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(order.id)}
                    onChange={() => toggleOne(order.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  />
                ) : null}
                <div>
                  <h2 className="font-semibold text-slate-950">
                    {order.customerName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{order.phone}</p>
                </div>
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
                  {order.itemsCount}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">
                  Cope
                </p>
                <p className="mt-1 text-lg font-semibold text-emerald-700">
                  {order.totalQuantity}
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
                <span className="block">{order.createdAtDateLabel}</span>
                <span className="mt-1 block text-[11px] text-slate-500">
                  {order.createdAtTimeLabel}
                </span>
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {renderActions(order)}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto xl:block">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50/90 text-left">
            <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {canDeleteOrders ? (
                <th className="px-5 py-4 text-center">Select</th>
              ) : null}
              <th className="px-5 py-4">Klienti</th>
              <th className="px-5 py-4 text-center">Artikuj</th>
              <th className="px-5 py-4 text-center">Cope</th>
              <th className="px-5 py-4 text-center">Burimi</th>
              <th className="px-5 py-4">Referenca</th>
              <th className="px-5 py-4 text-center">Statusi</th>
              <th className="px-5 py-4 text-right">Data</th>
              <th className="px-5 py-4 text-right">Veprime</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="align-top transition hover:bg-cyan-50/30"
              >
                {canDeleteOrders ? (
                  <td className="px-5 py-4 text-center">
                    {canDeleteOrders ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(order.id)}
                        onChange={() => toggleOne(order.id)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                      />
                    ) : null}
                  </td>
                ) : null}
                <td className="px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {order.customerName}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{order.phone}</p>
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <span className="inline-flex min-w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
                    {order.itemsCount}
                  </span>
                </td>
                <td className="px-5 py-4 text-center">
                  <span className="inline-flex min-w-12 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">
                    {order.totalQuantity}
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
                  <div>
                    <p>{order.createdAtDateLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {order.createdAtTimeLabel}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-4">{renderActions(order)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
