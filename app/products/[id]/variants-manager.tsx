"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmActionForm } from "@/app/components/confirm-action-form";
import { UploadedImage } from "@/app/components/uploaded-image";

type VariantItem = {
  id: number;
  size: string;
  color: string;
  sku: string | null;
  barcode: string | null;
  imagePath: string | null;
  stock: number;
  price: number;
};

type VariantsManagerProps = {
  productId: number;
  productName: string;
  canManageInventory: boolean;
  variants: VariantItem[];
  deleteVariantAction: (formData: FormData) => void | Promise<void>;
  bulkDeleteAction: (formData: FormData) => void | Promise<void>;
};

export function VariantsManager({
  productId,
  productName,
  canManageInventory,
  variants,
  deleteVariantAction,
  bulkDeleteAction,
}: VariantsManagerProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const allSelected = useMemo(
    () => variants.length > 0 && selectedIds.length === variants.length,
    [selectedIds, variants.length],
  );

  const serializedSelectedIds = JSON.stringify(selectedIds);

  const toggleOne = (variantId: number) => {
    setSelectedIds((current) =>
      current.includes(variantId)
        ? current.filter((id) => id !== variantId)
        : [...current, variantId],
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : variants.map((variant) => variant.id));
  };

  return (
    <div className="space-y-4">
      {canManageInventory && selectedIds.length > 0 ? (
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
            action={bulkDeleteAction}
            hiddenFields={[
              { name: "productId", value: productId },
              { name: "variantIds", value: serializedSelectedIds },
            ]}
            confirmMessage="A je i sigurt qe don t'i fshish variantet e zgjedhura?"
            buttonLabel="Fshi te zgjedhurat"
            className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:hidden">
        {variants.map((variant) => (
          <article
            key={variant.id}
            className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {canManageInventory ? (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(variant.id)}
                    onChange={() => toggleOne(variant.id)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  />
                ) : null}
                <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {variant.imagePath ? (
                    <a
                      href={variant.imagePath}
                      target="_blank"
                      rel="noreferrer"
                      className="block h-full w-full"
                    >
                      <UploadedImage
                        src={variant.imagePath}
                        alt={`${productName} ${variant.color}`}
                        className="h-full w-full object-cover"
                      />
                    </a>
                  ) : null}
                </div>
                <span className="inline-flex min-w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900">
                  {variant.size}
                </span>
                <div>
                  <p className="font-medium text-slate-900">{variant.color}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Variant #{variant.id}
                  </p>
                </div>
              </div>
              <span className="inline-flex min-w-16 items-center justify-center rounded-xl bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">
                {variant.stock}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <span className="font-medium text-slate-600">Cmimi</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {variant.price.toFixed(2)} EUR
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  SKU
                </p>
                <p className="mt-1 break-all font-medium text-slate-900">
                  {variant.sku || "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Barcode
                </p>
                <p className="mt-1 break-all font-medium text-slate-900">
                  {variant.barcode || "-"}
                </p>
              </div>
            </div>

            {canManageInventory ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href={`/products/${productId}/variants/${variant.id}/edit`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Edito
                </Link>
                <ConfirmActionForm
                  action={deleteVariantAction}
                  hiddenFields={[
                    { name: "variantId", value: variant.id },
                    { name: "productId", value: productId },
                  ]}
                  confirmMessage="A je i sigurt qe don ta fshish kete variant?"
                  buttonLabel="Fshi"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:bg-rose-100"
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {canManageInventory ? (
                  <th className="px-4 py-3.5 sm:px-5">Select</th>
                ) : null}
                <th className="px-4 py-3.5 sm:px-5">Foto</th>
                <th className="px-4 py-3.5 sm:px-5">Numri</th>
                <th className="px-4 py-3.5 sm:px-5">Ngjyra</th>
                <th className="px-4 py-3.5 sm:px-5">Kodi</th>
                <th className="px-4 py-3.5 text-right sm:px-5">Stoku</th>
                <th className="px-4 py-3.5 text-right sm:px-5">Cmimi</th>
                {canManageInventory ? (
                  <th className="px-4 py-3.5 text-right sm:px-5">Veprime</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {variants.map((variant) => (
                <tr
                  key={variant.id}
                  className="transition hover:bg-slate-50/80"
                >
                  {canManageInventory ? (
                    <td className="px-4 py-4 sm:px-5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(variant.id)}
                        onChange={() => toggleOne(variant.id)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-4 sm:px-5">
                    <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {variant.imagePath ? (
                        <a
                          href={variant.imagePath}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-full w-full"
                          title="Hape foton"
                        >
                          <UploadedImage
                            src={variant.imagePath}
                            alt={`${productName} ${variant.color}`}
                            className="h-full w-full object-cover transition hover:scale-105"
                          />
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-5">
                    <span className="inline-flex min-w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900">
                      {variant.size}
                    </span>
                  </td>
                  <td className="px-4 py-4 sm:px-5">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                      <span className="font-medium text-slate-800">
                        {variant.color}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-5">
                    <div className="space-y-1">
                      <p className="break-all font-medium text-slate-900">
                        {variant.sku || "-"}
                      </p>
                      <p className="break-all text-slate-500">
                        {variant.barcode || "Pa barcode"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right sm:px-5">
                    <span className="inline-flex min-w-16 items-center justify-center rounded-xl bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">
                      {variant.stock}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right sm:px-5">
                    <span className="font-semibold tabular-nums text-slate-900">
                      {variant.price.toFixed(2)} EUR
                    </span>
                  </td>
                  {canManageInventory ? (
                    <td className="px-4 py-4 text-right sm:px-5">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/products/${productId}/variants/${variant.id}/edit`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          Edito
                        </Link>
                        <ConfirmActionForm
                          action={deleteVariantAction}
                          hiddenFields={[
                            { name: "variantId", value: variant.id },
                            { name: "productId", value: productId },
                          ]}
                          confirmMessage="A je i sigurt qe don ta fshish kete variant?"
                          buttonLabel="Fshi"
                          className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:bg-rose-100"
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
