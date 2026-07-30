import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createElement, type ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import type { Prisma } from "@/app/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWarehouseStock } from "@/lib/stock-levels";
import { ProductsStockPdfDocument } from "../products-stock-pdf-document";

type StockSheetRow = {
  brand: string;
  imageSrc: string | null;
  sizes: Array<{ size: string; stock: number }>;
};

function buildWhere({
  q,
  brand,
  model,
  warehouseId,
}: {
  q: string;
  brand: string;
  model: string;
  warehouseId: number | null;
}): Prisma.ProductWhereInput {
  const filters: Prisma.ProductWhereInput[] = [];
  const searchTokens = q
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (searchTokens.length > 0) {
    filters.push({
      AND: searchTokens.map((token) => ({
        OR: [
          { name: { contains: token, mode: "insensitive" } },
          { brand: { contains: token, mode: "insensitive" } },
          {
            variants: {
              some: {
                color: { contains: token, mode: "insensitive" },
              },
            },
          },
          {
            variants: {
              some: {
                size: { contains: token, mode: "insensitive" },
              },
            },
          },
          {
            variants: {
              some: {
                sku: { contains: token, mode: "insensitive" },
              },
            },
          },
        ],
      })),
    });
  }

  if (brand) {
    filters.push({
      brand: {
        equals: brand,
        mode: "insensitive",
      },
    });
  }

  if (model) {
    filters.push({
      name: {
        equals: model,
        mode: "insensitive",
      },
    });
  }

  if (warehouseId) {
    filters.push({
      variants: {
        some: {
          stockLevels: {
            some: {
              warehouseId,
              quantity: {
                gt: 0,
              },
            },
          },
        },
      },
    });
  } else {
    filters.push({
      variants: {
        some: {
          active: true,
          stock: {
            gt: 0,
          },
        },
      },
    });
  }

  return filters.length > 0 ? { AND: filters } : {};
}

function getMimeType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

function isSupportedPdfImageMimeType(mimeType: string) {
  return mimeType === "image/jpeg" || mimeType === "image/png";
}

function normalizeMimeType(mimeType: string) {
  return mimeType.split(";")[0]?.trim().toLowerCase() || "";
}

function hasUnsupportedPdfImageSource(src: string) {
  const normalized = src.trim().toLowerCase();
  return (
    normalized.startsWith("data:image/webp") ||
    normalized.startsWith("data:image/avif") ||
    normalized.includes(".webp") ||
    normalized.includes(".avif")
  );
}

async function toPdfImageSource(
  origin: string,
  src: string | null,
): Promise<string | null> {
  if (!src) {
    return null;
  }

  if (hasUnsupportedPdfImageSource(src)) {
    return null;
  }

  if (/^https?:\/\//i.test(src)) {
    try {
      const response = await fetch(src);
      if (!response.ok) {
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      const mimeType = normalizeMimeType(
        response.headers.get("content-type") || getMimeType(src),
      );
      if (!isSupportedPdfImageMimeType(mimeType)) {
        return null;
      }
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return `data:${mimeType};base64,${base64}`;
    } catch {
      return null;
    }
  }

  const normalizedPath = src.startsWith("/") ? src.slice(1) : src;
  const absolutePath = path.join(process.cwd(), "public", normalizedPath);

  try {
    const fileBuffer = await fs.readFile(absolutePath);
    const mimeType = normalizeMimeType(getMimeType(absolutePath));
    if (!isSupportedPdfImageMimeType(mimeType)) {
      return null;
    }
    return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
  } catch {
    try {
      const response = await fetch(`${origin}${src.startsWith("/") ? src : `/${src}`}`);
      if (!response.ok) {
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      const mimeType = normalizeMimeType(
        response.headers.get("content-type") || getMimeType(src),
      );
      if (!isSupportedPdfImageMimeType(mimeType)) {
        return null;
      }
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return `data:${mimeType};base64,${base64}`;
    } catch {
      return null;
    }
  }
}

export async function GET(request: Request) {
  await requireUser();

  const { searchParams, origin } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const brand = searchParams.get("brand")?.trim() || "";
  const model = searchParams.get("model")?.trim() || "";
  const warehouse = searchParams.get("warehouse")?.trim() || "";
  const warehouseId = Number(warehouse) || null;

  const where = buildWhere({ q, brand, model, warehouseId });

  const [products, warehouses] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      select: {
        brand: true,
        variants: {
          where: { active: true },
          orderBy: [{ color: "asc" }, { size: "asc" }],
          select: {
            color: true,
            size: true,
            imagePath: true,
            stock: true,
            ...(warehouseId
              ? {
                  stockLevels: {
                    where: { warehouseId },
                    select: {
                      warehouseId: true,
                      quantity: true,
                    },
                  },
                }
              : {}),
          },
        },
      },
    }),
    prisma.warehouse.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const rawRows = products.flatMap((product) => {
    const grouped = new Map<
      string,
      { imagePath: string | null; sizes: Array<{ size: string; stock: number }> }
    >();

    for (const variant of product.variants) {
      const variantStock = resolveWarehouseStock(
        Array.isArray(variant.stockLevels) ? variant.stockLevels : undefined,
        variant.stock,
        warehouseId,
      );

      if (variantStock <= 0) {
        continue;
      }

      const key = variant.color.trim().toLowerCase();
      const current = grouped.get(key);

      if (current) {
        if (!current.imagePath && variant.imagePath) {
          current.imagePath = variant.imagePath;
        }
        current.sizes.push({
          size: variant.size,
          stock: variantStock,
        });
      } else {
        grouped.set(key, {
          imagePath: variant.imagePath,
          sizes: [
            {
              size: variant.size,
              stock: variantStock,
            },
          ],
        });
      }
    }

    return [...grouped.values()].map((item) => ({
      brand: product.brand,
      imagePath: item.imagePath,
      sizes: item.sizes.sort((a, b) =>
        a.size.localeCompare(b.size, "sq", {
          numeric: true,
          sensitivity: "base",
        }),
      ),
    }));
  });

  const rows: StockSheetRow[] = await Promise.all(
    rawRows.map(async (row) => ({
      brand: row.brand,
      imageSrc: await toPdfImageSource(origin, row.imagePath),
      sizes: row.sizes,
    })),
  );

  const warehouseLabel = warehouseId
    ? warehouses.find((item) => item.id === warehouseId)?.name ?? "Depo e zgjedhur"
    : "Te gjitha depot";

  const generatedAt = new Intl.DateTimeFormat("sq-AL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

  const document = createElement(ProductsStockPdfDocument, {
    rows,
    warehouseLabel,
    generatedAt,
    logoSrc: await toPdfImageSource(origin, "/logo.jpg"),
  }) as ReactElement<DocumentProps>;

  const pdfBuffer = await renderToBuffer(document);
  const pdfBytes = new Uint8Array(pdfBuffer);

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="lista-produkteve-stok.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
