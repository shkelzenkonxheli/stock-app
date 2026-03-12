import Link from "next/link";
import { prisma } from "@/lib/prisma";

type DashboardCardProps = {
  label: string;
  value: number;
  accent: string;
  glow: string;
};

function DashboardCard({
  label,
  value,
  accent,
  glow,
}: DashboardCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-white/60 px-5 py-5 shadow-[0_10px_35px_rgba(15,23,42,0.08)] ${glow}`}
    >
      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700/70">
          {label}
        </p>
        <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          {value}
        </p>
      </div>
      <div
        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-80 blur-2xl ${accent}`}
      />
    </div>
  );
}

type ActionCardProps = {
  href: string;
  title: string;
  description: string;
  tone: string;
};

function ActionCard({ href, title, description, tone }: ActionCardProps) {
  return (
    <Link
      href={href}
      className={`group rounded-[26px] border border-white/70 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.10)] ${tone}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
        </div>
        <span className="rounded-full border border-slate-900/10 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition group-hover:bg-white">
          Hape
        </span>
      </div>
    </Link>
  );
}

export default async function Home() {
  const productsCount = await prisma.product.count();
  const variantsCount = await prisma.variant.count();
  const ordersCount = await prisma.order.count();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff7ed_0%,transparent_22%),radial-gradient(circle_at_top_right,#e0f2fe_0%,transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-6 px-5 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Sneaker Warehouse
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Menaxhimi i stokut dhe porosive ne nje panel te vetem
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Kontrollo modelet, variantet dhe porosite ditore ne nje workflow
                te paster dhe praktik per magazinen.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="text-center">
                <p className="text-2xl font-semibold tracking-tight text-slate-950">
                  {productsCount}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                  Modele
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold tracking-tight text-slate-950">
                  {variantsCount}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                  Variante
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold tracking-tight text-slate-950">
                  {ordersCount}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                  Porosi
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DashboardCard
            label="Modele aktive"
            value={productsCount}
            accent="bg-orange-300"
            glow="bg-gradient-to-br from-orange-50 to-white"
          />
          <DashboardCard
            label="Variante ne sistem"
            value={variantsCount}
            accent="bg-sky-300"
            glow="bg-gradient-to-br from-sky-50 to-white"
          />
          <DashboardCard
            label="Porosi totale"
            value={ordersCount}
            accent="bg-emerald-300"
            glow="bg-gradient-to-br from-emerald-50 to-white"
          />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ActionCard
            href="/products/new"
            title="Shto produkt"
            description="Krijo modelin baze te patikes dhe vazhdo menjehere me variantet."
            tone="bg-gradient-to-br from-orange-50 to-white"
          />
          <ActionCard
            href="/products"
            title="Shiko produktet"
            description="Kontrollo inventarin, numrat, ngjyrat dhe stokun total per cdo model."
            tone="bg-gradient-to-br from-sky-50 to-white"
          />
          <ActionCard
            href="/orders/new"
            title="Shto porosi"
            description="Regjistro shpejt porosite nga Instagrami dhe pergatit depon per dalje."
            tone="bg-gradient-to-br from-emerald-50 to-white"
          />
          <ActionCard
            href="/orders"
            title="Shiko porosite"
            description="Shiko porosite aktive dhe statusin e pergatitjes ne nje liste te vetme."
            tone="bg-gradient-to-br from-violet-50 to-white"
          />
        </section>
      </div>
    </main>
  );
}
