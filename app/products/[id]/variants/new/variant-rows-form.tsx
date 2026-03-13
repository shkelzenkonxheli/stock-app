"use client";

import { useState } from "react";

type VariantRow = {
  id: string;
  size: string;
  color: string;
  stock: string;
  price: string;
};

type VariantRowsFormProps = {
  productId: number;
  action: (formData: FormData) => void | Promise<void>;
};

const createEmptyRow = (): VariantRow => ({
  id: crypto.randomUUID(),
  size: "",
  color: "",
  stock: "",
  price: "",
});

const cloneRow = (row: VariantRow): VariantRow => ({
  id: crypto.randomUUID(),
  size: row.size,
  color: row.color,
  stock: row.stock,
  price: row.price,
});

export function VariantRowsForm({
  productId,
  action,
}: VariantRowsFormProps) {
  const [rows, setRows] = useState<VariantRow[]>([createEmptyRow()]);

  const updateRow = (
    rowId: string,
    field: keyof Omit<VariantRow, "id">,
    value: string,
  ) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row,
      ),
    );
  };

  const addRow = () => {
    setRows((currentRows) => {
      const lastRow = currentRows[currentRows.length - 1];

      if (!lastRow) {
        return [createEmptyRow()];
      }

      return [...currentRows, cloneRow(lastRow)];
    });
  };

  const removeRow = (rowId: string) => {
    setRows((currentRows) => {
      if (currentRows.length === 1) {
        return currentRows;
      }

      return currentRows.filter((row) => row.id !== rowId);
    });
  };

  const serializedRows = JSON.stringify(
    rows.map(({ size, color, stock, price }) => ({
      size,
      color,
      stock,
      price,
    })),
  );

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rows" value={serializedRows} />

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50/90 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3.5 font-semibold uppercase tracking-[0.14em]">
                Numri
              </th>
              <th className="px-4 py-3.5 font-semibold uppercase tracking-[0.14em]">
                Ngjyra
              </th>
              <th className="px-4 py-3.5 font-semibold uppercase tracking-[0.14em]">
                Stoku
              </th>
              <th className="px-4 py-3.5 font-semibold uppercase tracking-[0.14em]">
                Cmimi
              </th>
              <th className="px-4 py-3.5 font-semibold uppercase tracking-[0.14em]">
                Hiq
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row, index) => (
              <tr key={row.id} className="transition hover:bg-amber-50/30">
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={row.size}
                    onChange={(event) =>
                      updateRow(row.id, "size", event.target.value)
                    }
                    placeholder={index === 0 ? "41" : "42"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={row.color}
                    onChange={(event) =>
                      updateRow(row.id, "color", event.target.value)
                    }
                    placeholder={index === 0 ? "Red" : "Black"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    value={row.stock}
                    onChange={(event) =>
                      updateRow(row.id, "stock", event.target.value)
                    }
                    placeholder="20"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.price}
                    onChange={(event) =>
                      updateRow(row.id, "price", event.target.value)
                    }
                    placeholder="89.99"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Hiq
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
        Kur shtyp `+ Shto rresht`, rreshti i fundit kopjohet automatikisht.
        Zakonisht mjafton te nderrosh vetem numrin.
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          + Shto rresht
        </button>

        <button
          type="submit"
          className="rounded-2xl bg-amber-500 px-5 py-2.5 font-semibold text-slate-950 shadow-[0_10px_25px_rgba(245,158,11,0.22)] transition hover:bg-amber-400"
        >
          Ruaj variantet
        </button>
      </div>
    </form>
  );
}
