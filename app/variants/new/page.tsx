import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function LegacyVariantRoutePage() {
  await requireRole(["SUPER_ADMIN"]);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          Varianti shtohet brenda produktit
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Zgjidh fillimisht nje produkt dhe pastaj perdor butonin "Shto
          Variant" brenda faqes se tij.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/products"
            className="rounded-xl bg-black px-4 py-2 text-sm text-white"
          >
            Shko te Patikat
          </Link>
        </div>
      </div>
    </main>
  );
}
