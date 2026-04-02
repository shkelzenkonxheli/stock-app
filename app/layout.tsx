import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { logout } from "@/app/actions/auth";
import { AppShellNav } from "@/app/components/app-shell-nav";
import { getCurrentUser, hasRole } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stock App",
  description: "Sneaker stock and order management",
};

function roleLabel(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "SELLER":
      return "Seller";
    case "WAREHOUSE":
      return "Warehouse";
    default:
      return role;
  }
}

function userInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  const navItems = currentUser
    ? [
        {
          href: "/",
          label: "Dashboard",
          icon: (
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-none stroke-current stroke-[1.8]"
            >
              <path d="M4 13h6V4H4zm10 7h6V11h-6zM4 20h6v-3H4zm10-9h6V4h-6z" />
            </svg>
          ),
        },
        {
          href: "/products",
          label: "Inventory",
          icon: (
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-none stroke-current stroke-[1.8]"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          ),
        },
        {
          href: "/orders",
          label: "Orders",
          icon: (
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-none stroke-current stroke-[1.8]"
            >
              <path d="M7 6h10M7 12h10M7 18h6" />
            </svg>
          ),
        },
        ...(hasRole(currentUser, ["SUPER_ADMIN"])
          ? [
              {
                href: "/stock/incoming",
                label: "Hyrje Stoku",
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 fill-none stroke-current stroke-[1.8]"
                  >
                    <path d="m12 19 6-6M12 19l-6-6M12 5v14" />
                  </svg>
                ),
              },
            ]
          : []),
        ...(hasRole(currentUser, ["SUPER_ADMIN"])
          ? [
              {
                href: "/users",
                label: "Users",
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 fill-none stroke-current stroke-[1.8]"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                    <circle cx="9.5" cy="7" r="3.5" />
                    <path d="M20 8v6M23 11h-6" />
                  </svg>
                ),
              },
            ]
          : []),
      ]
    : [];

  return (
    <html lang="en" className="light" style={{ colorScheme: "light" }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#f3f6fb] text-slate-950 antialiased`}
      >
        <div className="min-h-screen">
          {currentUser ? (
            <div className="flex min-h-screen print:block">
              <aside className="hidden w-[248px] shrink-0 border-r border-slate-200 bg-[#edf2f8] px-5 py-6 xl:flex xl:flex-col print:hidden">
                <Link href="/" className="flex items-center gap-3">
                  <span className="relative h-11 w-11 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <Image
                      src="/logo.jpg"
                      alt="Logo"
                      fill
                      className="object-cover"
                      sizes="44px"
                      priority
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold tracking-tight text-slate-950">
                      Shkel Shoes
                    </p>
                    <p className="text-xs text-slate-500">Stock Control</p>
                  </div>
                </Link>

                <div className="mt-8">
                  <AppShellNav items={navItems} />
                </div>

                <div className="mt-auto space-y-3 border-t border-slate-200 pt-5">
                  <div className="rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Aktive
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {currentUser.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {roleLabel(currentUser.role)}
                    </p>
                  </div>
                  <form action={logout}>
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      Log Out
                    </button>
                  </form>
                </div>
              </aside>

              <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/92 backdrop-blur print:hidden">
                  <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3 xl:hidden">
                      <Link
                        href="/"
                        className="flex min-w-0 items-center gap-3 text-lg font-semibold tracking-tight text-slate-950"
                      >
                        <span className="relative h-10 w-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <Image
                            src="/logo.jpg"
                            alt="Logo"
                            fill
                            className="object-cover"
                            sizes="40px"
                            priority
                          />
                        </span>
                        <span className="truncate">PrecisionLedger</span>
                      </Link>
                    </div>

                    <div className="hidden min-w-[280px] max-w-md flex-1 xl:block">
                      <div className="relative">
                        <input
                          readOnly
                          value=""
                          placeholder="Kërko variante..."
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-600 outline-none placeholder:text-slate-400"
                        />
                        <svg
                          viewBox="0 0 24 24"
                          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-400 stroke-[1.8]"
                        >
                          <circle cx="11" cy="11" r="6" />
                          <path d="m20 20-3.5-3.5" />
                        </svg>
                      </div>
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                      <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 sm:inline-flex">
                        {roleLabel(currentUser.role)}
                      </span>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                          {userInitials(currentUser.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-[140px] truncate text-sm font-medium text-slate-900">
                            {currentUser.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </header>

                <div className="flex-1">{children}</div>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </body>
    </html>
  );
}
