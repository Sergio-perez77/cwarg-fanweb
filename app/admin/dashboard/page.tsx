import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import AdminLogoutButton from "../components/AdminLogoutButton";

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

  if (roleError || !roles) {
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

  const sections = [
    {
      title: "Integrantes",
      description: "Administrar perfiles y biografías de The Obsession.",
      icon: "♙",
      href: "/admin/dashboard/integrantes",
      available: true,
    },
    {
      title: "Noticias",
      description: "Crear y administrar publicaciones.",
      icon: "✦",
      href: "/admin/dashboard/news",
      available: true,
    },
    {
      title: "Discografía",
      description: "Administrar álbumes y canciones.",
      icon: "♫",
      available: false,
    },
    {
      title: "Multimedia",
      description: "Gestionar fotografías y videos.",
      icon: "▣",
      available: false,
    },
    {
      title: "Comentarios",
      description: "Moderar comentarios de usuarios.",
      icon: "☰",
      href: "/admin/dashboard/comentarios",
      available: true,
    },
    {
      title: "Usuarios",
      description: "Gestionar cuentas y permisos.",
      icon: "♙",
      available: isSuperAdmin,
    },
    {
      title: "Configuración",
      description: "Administrar opciones del sitio.",
      icon: "⚙",
      available: isSuperAdmin,
    },
  ];

  return (
    <main className="min-h-screen bg-[#080706] text-[#f8f3e5]">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="w-full border-b border-[#d4af37]/20 bg-[#100e09] p-5 md:w-72 md:border-b-0 md:border-r md:p-6">
          <div className="mb-10">
            <p className="text-xs tracking-[0.3em] text-[#d4af37]">
              CHARLOTTE WESSELS
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              Administración
            </h2>
            <p className="mt-2 text-xs text-[#a99e83]">
              Argentina · CMS
            </p>
          </div>

          <nav className="space-y-2">
            <div className="rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-3 text-sm text-[#d4af37]">
              ◈ Dashboard
            </div>

            <p className="px-4 pt-5 text-xs uppercase tracking-widest text-[#766b54]">
              Gestión de contenido
            </p>

            <Link
                href="/admin/dashboard/integrantes"
                className="block rounded-lg px-4 py-3 text-sm text-[#c7bda5] transition hover:bg-white/5 hover:text-[#d4af37]"
              >
                <span className="mr-3 text-[#d4af37]">♙</span>
                Integrantes
              </Link>

            <Link
              href="/admin/dashboard/news"
              className="block rounded-lg px-4 py-3 text-sm text-[#c7bda5] transition hover:bg-white/5 hover:text-[#d4af37]"
            >
              <span className="mr-3 text-[#d4af37]">✦</span>
              Noticias
            </Link>

            <Link
              href="/admin/dashboard/comentarios"
              className="block rounded-lg px-4 py-3 text-sm text-[#c7bda5] transition hover:bg-white/5 hover:text-[#d4af37]"
            >
              <span className="mr-3 text-[#d4af37]">☰</span>
              Comentarios
            </Link>

            {sections
              .filter((section) => !section.available && !["Usuarios", "Configuración"].includes(section.title))
              .map((section) => (
                <div
                  key={section.title}
                  className="rounded-lg px-4 py-3 text-sm text-[#766b54]"
                >
                  <span className="mr-3">{section.icon}</span>
                  {section.title}
                  <span className="ml-2 text-xs">Próximamente</span>
                </div>
              ))}
          </nav>

          <div className="mt-10 border-t border-[#d4af37]/15 pt-5">
            <AdminLogoutButton />
          </div>
        </aside>

        <section className="min-w-0 flex-1 p-6 md:p-10">
          <header className="mb-10 flex flex-col gap-5 border-b border-[#d4af37]/15 pb-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 text-xs tracking-[0.25em] text-[#d4af37]">
                PANEL DE CONTROL
              </p>
              <h1 className="text-3xl font-semibold">Dashboard</h1>
              <p className="mt-3 text-sm text-[#a99e83]">
                Bienvenido/a al centro de administración.
              </p>
            </div>

            <div className="rounded-lg border border-[#d4af37]/20 bg-[#15120a] px-4 py-3">
              <p className="text-xs text-[#a99e83]">Sesión activa</p>
              <p className="mt-1 break-all text-sm">{user.email}</p>
              <p className="mt-2 text-xs text-[#d4af37]">
                {isSuperAdmin ? "Super Admin" : "Administrador"}
              </p>
            </div>
          </header>

          <div className="mb-10 rounded-xl border border-[#d4af37]/20 bg-[#15120a] p-6">
            <p className="text-xs uppercase tracking-widest text-[#d4af37]">
              Estado del proyecto
            </p>
            <h2 className="mt-3 text-xl font-semibold">
              Estructura administrativa inicial
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#a99e83]">
              El panel cuenta con autenticación y control de acceso.
              Los módulos se habilitarán progresivamente.
            </p>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Módulos administrativos
            </h2>
            <span className="text-xs text-[#a99e83]">
              {sections.filter((s) => s.available).length} módulos
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {sections
              .filter((section) => section.available)
              .map((section) => (
                <Link
                  key={section.title}
                  href={section.href ?? "#"}
                  className="group rounded-xl border border-[#d4af37]/15 bg-[#100e09] p-6 transition hover:border-[#d4af37]/40 hover:bg-[#17130a]"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/10 text-xl text-[#d4af37]">
                    {section.icon}
                  </div>
                  <h3 className="text-lg font-semibold">
                    {section.title}
                  </h3>
                  <p className="mt-2 min-h-10 text-sm leading-5 text-[#a99e83]">
                    {section.description}
                  </p>
                  <div className="mt-6 border-t border-[#d4af37]/10 pt-4">
                    <span className="text-xs text-[#d4af37]">
                      {section.title === "Noticias"
                        ? "Administrar noticias →"
                        : section.title === "Integrantes"
                        ? "Administrar integrantes →"
                        : "Próximamente"}
                    </span>
                  </div>
                </Link>
              ))}
          </div>

          {!isSuperAdmin && (
            <p className="mt-8 text-xs text-[#766b54]">
              Los módulos de Usuarios y Configuración están reservados
              al Super Admin.
            </p>
          )}

          <footer className="mt-14 border-t border-[#d4af37]/10 pt-6 text-xs text-[#766b54]">
            Charlotte Wessels Argentina · Panel administrativo
          </footer>
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