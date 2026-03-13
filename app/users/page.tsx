import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { AddUserModal } from "./add-user-modal";

type UsersPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
    add?: string;
  }>;
};

async function createUser(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN"]);

  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();
  const role = formData.get("role")?.toString() as
    | "SUPER_ADMIN"
    | "SELLER"
    | "WAREHOUSE"
    | undefined;

  if (!name || !email || !password || password.length < 6 || !role) {
    redirect("/users?error=validation");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    redirect("/users?error=email");
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
    },
  });

  redirect("/users?success=created");
}

function getMessage(error?: string, success?: string) {
  if (error === "validation") {
    return {
      type: "error" as const,
      text: "Ploteso te gjitha fushat dhe vendos password me te pakten 6 karaktere.",
    };
  }

  if (error === "email") {
    return {
      type: "error" as const,
      text: "Ky email ekziston tashme ne sistem.",
    };
  }

  if (success === "created") {
    return {
      type: "success" as const,
      text: "Useri u krijua me sukses.",
    };
  }

  return null;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  await requireRole(["SUPER_ADMIN"]);

  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const message = getMessage(
    resolvedSearchParams?.error,
    resolvedSearchParams?.success,
  );
  const isAddOpen =
    resolvedSearchParams?.add === "1" ||
    resolvedSearchParams?.success === "created" ||
    Boolean(resolvedSearchParams?.error);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-5 sm:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Access Control
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Menaxho userat
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Lista e userave aktive dhe roleve te tyre.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
              >
                Home
              </Link>
              <AddUserModal action={createUser} open={isAddOpen} message={message} />
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-5 lg:hidden">
            {users.map((user) => (
              <article
                key={user.id}
                className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-slate-950">
                      {user.name}
                    </h2>
                    <p className="mt-1 break-all text-sm text-slate-600">
                      {user.email}
                    </p>
                  </div>
                  <span className="inline-flex rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                    {user.role}
                  </span>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-5 py-4">Emri</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Roli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-4 font-medium text-slate-950">
                      {user.name}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{user.email}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                        {user.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
