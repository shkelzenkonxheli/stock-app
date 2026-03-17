import type { ReactNode } from "react";
import Link from "next/link";
import { hasRole, requireUser } from "@/lib/auth";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

type Tile = {
  title: string;
  subtitle: string;
  href?: string;
  color: string;
  icon: ReactNode;
  visible: boolean;
  disabled?: boolean;
};

function DashboardTile({ title, subtitle, href, color, icon, disabled }: Tile) {
  const content = (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/18 text-white ring-1 ring-white/20 backdrop-blur-sm sm:h-14 sm:w-14">
        {icon}
      </div>
      <div>
        <h2 className="text-[15px] font-semibold leading-tight tracking-tight text-white sm:text-base">
          {title}
        </h2>
        <p className="mt-1 text-[11px] font-medium text-white/80 sm:text-xs">
          {subtitle}
        </p>
      </div>
    </div>
  );

  const baseClassName = `aspect-square rounded-2xl p-3 shadow-[0_14px_28px_rgba(15,23,42,0.18)] sm:p-4 ${color}`;

  if (disabled || !href) {
    return (
      <div className={`${baseClassName} opacity-80 saturate-75`}>{content}</div>
    );
  }

  return (
    <Link
      href={href}
      className={`${baseClassName} cursor-pointer`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {content}
    </Link>
  );
}

export default async function Home() {
  const currentUser = await requireUser();
  const canManageInventory = hasRole(currentUser, ["SUPER_ADMIN"]);
  const canCreateOrders = hasRole(currentUser, ["SUPER_ADMIN", "SELLER"]);
  const canManageOrders = hasRole(currentUser, [
    "SUPER_ADMIN",
    "SELLER",
    "WAREHOUSE",
  ]);
  const canManageUsers = hasRole(currentUser, ["SUPER_ADMIN"]);
  const lowStockCount = await prisma.variant.count({
    where: {
      stock: {
        gt: 0,
        lte: LOW_STOCK_THRESHOLD,
      },
    },
  });

  const tiles: Tile[] = [
    {
      title: "Produktet",
      subtitle:
        lowStockCount > 0
          ? `${lowStockCount} variante me stok te ulet`
          : "Inventari",
      href: "/products",
      color: "bg-sky-500",
      visible: true,
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      ),
    },
    {
      title: "Shto Produkt",
      subtitle: "Model i ri",
      href: "/products/new",
      color: "bg-emerald-500",
      visible: canManageInventory,
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      ),
    },
    {
      title: "Porosite",
      subtitle: "Lista e shitjeve",
      href: "/orders",
      color: "bg-orange-500",
      visible: canManageOrders,
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
        >
          <path d="M7 6h10M7 12h10M7 18h6" />
        </svg>
      ),
    },
    {
      title: "Shto Porosi",
      subtitle: "Regjistro shitje",
      href: "/orders/new",
      color: "bg-rose-500",
      visible: canCreateOrders,
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      ),
    },
    {
      title: "Hyrje Stoku",
      subtitle: "Coming Soon",
      color: "bg-violet-500",
      visible: canManageInventory,
      disabled: true,
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
        >
          <path d="m12 19 6-6M12 19l-6-6M12 5v14" />
        </svg>
      ),
    },
    {
      title: "Dalje Stoku",
      subtitle: "Coming Soon",
      color: "bg-red-500",
      visible: canManageOrders,
      disabled: true,
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
        >
          <path d="m12 5 6 6M12 5 6 11M12 19V5" />
        </svg>
      ),
    },
    {
      title: "Menaxho Userat",
      subtitle: "Qasja dhe rolet",
      href: "/users",
      color: "bg-indigo-500",
      visible: canManageUsers,
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 8.92 4a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c0 .67.39 1.28 1 1.51H21a2 2 0 0 1 0 4h-.09c-.61.23-1 .84-1 1.49Z" />
        </svg>
      ),
    },
  ];

  const visibleTiles = tiles.filter((tile) => tile.visible);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,transparent_26%),radial-gradient(circle_at_bottom_right,#fde68a_0%,transparent_24%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <section className="w-full rounded-[28px] border border-white/80 bg-white/72 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:rounded-[32px] sm:p-5">
          <div className="mb-4 text-center sm:mb-5">
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Menaxhimi i Stokut
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {visibleTiles.map((tile) => (
              <DashboardTile key={tile.title} {...tile} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
