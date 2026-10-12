import { NextResponse } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWarehouseStock } from "@/lib/stock-levels";
import { getDefaultWarehouse } from "@/lib/warehouses";

function buildWhere({
  q,
  brand,
  model,
  warehouseId,
  defaultWarehouseId,
}: {
  q: string;
  brand: string;
  model: string;
  warehouseId: number | null;
  defaultWarehouseId: number | null;
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
      OR: [
        {
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
        },
        ...(warehouseId === defaultWarehouseId
          ? [
              {
                variants: {
                  some: {
                    active: true,
                    stock: {
                      gt: 0,
                    },
                    stockLevels: {
                      none: {},
                    },
                  },
                },
              },
            ]
          : []),
      ],
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

function escapeCsv(value: string | number | null | undefined) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  await requireUser();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const brand = searchParams.get("brand")?.trim() || "";
  const model = searchParams.get("model")?.trim() || "";
  const warehouse = searchParams.get("warehouse")?.trim() || "";
  const warehouseId = Number(warehouse) || null;
  const defaultWarehouse = await getDefaultWarehouse();
  const defaultWarehouseId = defaultWarehouse?.id ?? null;

  const where = buildWhere({
    q,
    brand,
    model,
    warehouseId,
    defaultWarehouseId,
  });

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ brand: "asc" }, { name: "asc" }],
    select: {
      id: true,
      brand: true,
      name: true,
      variants: {
        where: { active: true },
        orderBy: [{ color: "asc" }, { size: "asc" }],
        select: {
          id: true,
          size: true,
          color: true,
          sku: true,
          stock: true,
          price: true,
          imagePath: true,
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
  });

  const rows = [
    [
      "brand",
      "model",
      "color",
      "size",
      "sku",
      "stock",
      "price",
      "image",
      "warehouse",
    ].join(","),
  ];

  for (const product of products) {
    for (const variant of product.variants) {
      const stock = resolveWarehouseStock(
        Array.isArray(variant.stockLevels) ? variant.stockLevels : undefined,
        variant.stock,
        warehouseId,
        defaultWarehouseId,
      );

      if (stock <= 0) {
        continue;
      }

      rows.push(
        [
          escapeCsv(product.brand),
          escapeCsv(product.name),
          escapeCsv(variant.color),
          escapeCsv(variant.size),
          escapeCsv(variant.sku),
          escapeCsv(stock),
          escapeCsv(Number(variant.price).toFixed(2)),
          escapeCsv(variant.imagePath ?? ""),
          escapeCsv(warehouseId ? String(warehouseId) : "all"),
        ].join(","),
      );
    }
  }

  const csv = rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="products-stock-export.csv"',
      "Cache-Control": "no-store",
    },
  });
}
