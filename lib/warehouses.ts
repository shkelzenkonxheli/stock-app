import { prisma } from "@/lib/prisma";

export async function getActiveWarehouses() {
  return prisma.warehouse.findMany({
    where: { active: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getDefaultWarehouse() {
  return prisma.warehouse.findFirst({
    where: { active: true, isDefault: true },
    orderBy: { id: "asc" },
  });
}
