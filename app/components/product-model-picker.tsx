"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UploadedImage } from "@/app/components/uploaded-image";

type ProductOption = {
  id: number;
  name: string;
  brand: string;
  imagePath: string | null;
};

type HoverPreview = {
  imagePath: string;
  name: string;
  top: number;
  left: number;
};

type ProductModelPickerProps = {
  products: ProductOption[];
  selectedProductId: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  emptyLabel: string;
  displayMode?: "dropdown" | "modalCards";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

export function ProductModelPicker({
  products,
  selectedProductId,
  onSelect,
  disabled = false,
  placeholder,
  emptyLabel,
  displayMode = "dropdown",
  open,
  onOpenChange,
  hideTrigger = false,
}: ProductModelPickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;

  const setIsOpen = useCallback((next: boolean | ((current: boolean) => boolean)) => {
    const resolved = typeof next === "function" ? next(isOpen) : next;

    if (!isControlled) {
      setInternalOpen(resolved);
    }

    onOpenChange?.(resolved);
  }, [isControlled, isOpen, onOpenChange]);

  const selectedProduct =
    products.find((product) => String(product.id) === selectedProductId) ?? null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setHoverPreview(null);
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHoverPreview(null);
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, setIsOpen]);

  return (
    <div ref={rootRef} className="relative">
      {!hideTrigger ? (
        <button
          type="button"
          onClick={() => {
            if (!disabled) {
              setHoverPreview(null);
              setIsOpen((current) => !current);
            }
          }}
          disabled={disabled}
          className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-900 outline-none transition hover:border-slate-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <span className="min-w-0 truncate">
            {selectedProduct ? selectedProduct.name : placeholder}
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="ml-3 h-4 w-4 shrink-0 text-slate-400"
          >
            <path
              d="m5.75 7.75 4.25 4.5 4.25-4.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}

      {isOpen && displayMode === "dropdown" ? (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
        >
          {products.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-500">{emptyLabel}</div>
          ) : (
            <div className="max-h-72 overflow-y-auto p-2">
              <div className="space-y-1">
                {products.map((product) => {
                  const selected = String(product.id) === selectedProductId;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setHoverPreview(null);
                        onSelect(String(product.id));
                        setIsOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        selected
                          ? "bg-emerald-50 text-slate-950"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                        onMouseEnter={(event) => {
                          if (!product.imagePath || !dropdownRef.current) {
                            return;
                          }

                          const imageRect =
                            event.currentTarget.getBoundingClientRect();
                          const dropdownRect =
                            dropdownRef.current.getBoundingClientRect();

                          setHoverPreview({
                            imagePath: product.imagePath,
                            name: product.name,
                            top:
                              imageRect.top -
                              dropdownRect.top +
                              imageRect.height / 2 -
                              18,
                            left:
                              imageRect.left -
                              dropdownRect.left +
                              imageRect.width +
                              8,
                          });
                        }}
                        onMouseLeave={() => setHoverPreview(null)}
                      >
                        {product.imagePath ? (
                          <UploadedImage
                            src={product.imagePath}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                            IMG
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {product.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {product.brand}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hoverPreview ? (
            <div
              className="pointer-events-none absolute z-40 hidden w-40 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_44px_rgba(15,23,42,0.18)] lg:block"
              style={{
                top: `${hoverPreview.top}px`,
                left: `${hoverPreview.left}px`,
              }}
            >
              <div className="overflow-hidden rounded-xl bg-slate-100">
                <UploadedImage
                  src={hoverPreview.imagePath}
                  alt={hoverPreview.name}
                  className="h-40 w-full object-cover"
                />
              </div>
              <p className="mt-2 truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {hoverPreview.name}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {isOpen && displayMode === "modalCards" ? (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/55 p-4 sm:items-center">
          <button
            type="button"
            onClick={() => {
              setHoverPreview(null);
              setIsOpen(false);
            }}
            className="absolute inset-0"
            aria-label="Mbyll zgjedhjen e modelit"
          />
          <div className="relative z-[111] flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-lg font-semibold text-slate-950">
                  Zgjidh modelin
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Zgjedh modelin nga lista me foto
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHoverPreview(null);
                  setIsOpen(false);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                aria-label="Mbyll"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M6 6l8 8M14 6l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {products.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                {emptyLabel}
              </div>
            ) : (
              <div className="overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {products.map((product) => {
                    const selected = String(product.id) === selectedProductId;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          setHoverPreview(null);
                          onSelect(String(product.id));
                          setIsOpen(false);
                        }}
                        className={`overflow-hidden rounded-[20px] border text-left transition ${
                          selected
                            ? "border-emerald-300 bg-emerald-50 shadow-[0_14px_30px_rgba(16,185,129,0.12)]"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="aspect-[1/1] overflow-hidden bg-slate-100">
                          {product.imagePath ? (
                            <UploadedImage
                              src={product.imagePath}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                              IMG
                            </div>
                          )}
                        </div>
                        <div className="px-2.5 py-2.5">
                          <p className="truncate text-[13px] font-semibold text-slate-950">
                            {product.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {product.brand}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
