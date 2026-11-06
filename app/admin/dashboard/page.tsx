import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

function DashboardLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#080706] text-[#d4af37]">
      Cargando panel administrativo...
    </main>
  );
}

async function DashboardContent() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/admin/login");
  }

  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError || !roles || roles.length === 0) {
    redirect("/admin/login");
  }

  const isSuperAdmin = roles.some(
    (item) => item.role === "superadmin"
  );

  const isAdmin = roles.some(
    (item) => item.role === "admin"
  );

  if (!isSuperAdmin && !isAdmin) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#080706] px-6 py-12 text-[#f8f3e5]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 border-b border-[#d4af37]/20 pb-8">
          <p className="mb-2 text-sm tracking-[0.3em] text-[#d4af37]">
            CHARLOTTE WESSELS ARGENTINA
          </p>

          <h1 className="text-3xl font-semibold">
            Panel administrativo
          </h1>

          <p className="mt-3 text-sm text-[#a99e83]">
            Sesión iniciada: {user.email}
          </p>

          <p className="mt-1 text-sm text-[#d4af37]">
            Rol: {isSuperAdmin ? "Super Admin" : "Administrador"}
          </p>
        </header>

        <section>
          <h2 className="mb-6 text-xl font-semibold">
            Administración del sitio
          </h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Noticias", "Crear y administrar publicaciones"],
              ["Discografía", "Administrar álbumes y canciones"],
              ["Multimedia", "Gestionar imágenes y videos"],
              ["Comentarios", "Moderar comentarios de usuarios"],
              ["Usuarios", "Gestionar cuentas y permisos"],
              ["Configuración", "Administrar opciones del sitio"],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-xl border border-[#d4af37]/20 bg-[#15120a] p-6"
              >
                <h3 className="mb-2 text-lg font-semibold">
                  {title}
                </h3>

                <p className="text-sm text-[#a99e83]">
                  {description}
                </p>

                <p className="mt-5 text-xs text-[#d4af37]">
                  Próximamente
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}