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
    setRows((currentRows) => [...currentRows, createEmptyRow()]);
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

      <div className="overflow-hidden rounded-2xl border">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Numri</th>
              <th className="px-4 py-3 font-medium">Ngjyra</th>
              <th className="px-4 py-3 font-medium">Stoku</th>
              <th className="px-4 py-3 font-medium">Cmimi</th>
              <th className="px-4 py-3 font-medium">Hiq</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={row.size}
                    onChange={(event) =>
                      updateRow(row.id, "size", event.target.value)
                    }
                    placeholder={index === 0 ? "41" : "42"}
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
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
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
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
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
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
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    className="rounded-lg border px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Hiq
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          className="rounded-xl border border-black px-4 py-2 text-sm text-black"
        >
          + Shto rresht
        </button>

        <button
          type="submit"
          className="rounded-xl bg-black px-5 py-2 text-white transition hover:bg-gray-800"
        >
          Ruaj variantet
        </button>
      </div>
    </form>
  );
}
