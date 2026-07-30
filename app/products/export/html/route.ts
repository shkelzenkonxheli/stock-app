import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWarehouseStock } from "@/lib/stock-levels";

type StockSheetRow = {
  brand: string;
  imageUrl: string | null;
  sizes: Array<{ size: string; stock: number }>;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toAbsoluteImageUrl(origin: string, src: string | null) {
  if (!src) {
    return null;
  }

  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  if (src.startsWith("/")) {
    return `${origin}${src}`;
  }

  return `${origin}/${src}`;
}

function getMimeType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

async function toInlineImageSrc(origin: string, src: string | null) {
  if (!src) {
    return null;
  }

  if (/^data:/i.test(src)) {
    return src;
  }

  if (/^https?:\/\//i.test(src)) {
    try {
      const response = await fetch(src);
      if (!response.ok) {
        return src;
      }

      const arrayBuffer = await response.arrayBuffer();
      const mimeType = response.headers.get("content-type") || getMimeType(src);
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return `data:${mimeType};base64,${base64}`;
    } catch {
      return src;
    }
  }

  const normalizedPath = src.startsWith("/") ? src.slice(1) : src;
  const absolutePath = path.join(process.cwd(), "public", normalizedPath);

  try {
    const fileBuffer = await fs.readFile(absolutePath);
    const mimeType = getMimeType(absolutePath);
    return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
  } catch {
    return toAbsoluteImageUrl(origin, src);
  }
}

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

function renderHtml(
  rows: StockSheetRow[],
  warehouseLabel: string,
  generatedAt: string,
  logoUrl: string | null,
) {
  const cards = rows
    .map((row) => {
      const image = row.imageUrl
        ? `<img src="${escapeHtml(row.imageUrl)}" alt="${escapeHtml(
            row.brand,
          )}" style="width:100%;height:260px;object-fit:cover;display:block;" />`
        : `<div style="width:100%;height:260px;background:#f8fafc;color:#94a3b8;font-size:12px;display:flex;align-items:center;justify-content:center;">PA FOTO</div>`;

      const sizeChips = row.sizes
        .map(
          (item) => `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 9px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
              <span style="font-size:11px;font-weight:700;color:#0f172a;">Nr ${escapeHtml(
                item.size,
              )}</span>
              <span style="font-size:11px;font-weight:700;color:#166534;">${item.stock}</span>
            </div>
          `,
        )
        .join("");

      return `
        <article style="overflow:hidden;border:1px solid #e2e8f0;border-radius:24px;background:#fff;box-shadow:0 14px 34px rgba(15,23,42,0.06);break-inside:avoid;">
          <div style="background:#e2e8f0;">${image}</div>
          <div style="padding:12px 14px 14px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
              <div>
                <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#64748b;margin-bottom:4px;">Brandi</div>
                <div style="font-size:20px;font-weight:700;color:#0f172a;">${escapeHtml(
                  row.brand,
                )}</div>
              </div>
              <div style="padding:7px 10px;border-radius:14px;background:#ecfdf5;color:#166534;font-size:12px;font-weight:700;">
                ${row.sizes.reduce((sum, item) => sum + item.stock, 0)} gjithsej
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
              ${sizeChips}
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="sq">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lista e produkteve</title>
  </head>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:1200px;margin:0 auto;padding:32px 20px;">
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:24px 24px 18px;box-shadow:0 18px 45px rgba(15,23,42,0.06);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px;">
          <div style="display:flex;align-items:center;gap:14px;">
            ${
              logoUrl
                ? `<img
              src="${escapeHtml(logoUrl)}"
              alt="ShkelShoes"
              style="width:56px;height:56px;object-fit:cover;border-radius:16px;border:1px solid #e2e8f0;background:#fff;display:block;"
            />`
                : `<div style="width:56px;height:56px;border-radius:16px;border:1px solid #e2e8f0;background:#f8fafc;color:#94a3b8;font-size:10px;display:flex;align-items:center;justify-content:center;">LOGO</div>`
            }
            <div style="font-size:20px;font-weight:800;color:#0f172a;line-height:1.1;">ShkelShoes</div>
          </div>
          <div style="font-size:13px;color:#64748b;text-align:right;">Depoja: ${escapeHtml(
            warehouseLabel,
          )}<br />Gjeneruar: ${escapeHtml(generatedAt)}</div>
        </div>

        ${
          cards
            ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;">${cards}</div>`
            : `<div style="padding:18px;border:1px solid #e2e8f0;border-radius:16px;color:#64748b;">Nuk ka te dhena per kete eksport.</div>`
        }
      </div>
    </div>
  </body>
</html>`;
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
        name: true,
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
      imageUrl: await toInlineImageSrc(origin, row.imagePath),
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

  const html = renderHtml(
    rows,
    warehouseLabel,
    generatedAt,
    await toInlineImageSrc(origin, "/logo.jpg"),
  );

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lista-produkteve-ngjyra-stok.html"',
      "Cache-Control": "no-store",
    },
  });
}
