"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import RoleStars from "@/app/components/RoleStars";

type SiteUser = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
};

export default function UsuariosAdminClient() {
  const supabase = createClient();

  const [users, setUsers] = useState<SiteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.rpc(
      "admin_list_site_users"
    );

    if (error) {
      setError("No se pudieron cargar los usuarios.");
      setUsers([]);
    } else {
      setUsers((data || []) as SiteUser[]);
    }

    setLoading(false);
  }

  async function toggleAdmin(user: SiteUser) {
    const isAdmin = user.roles.includes("admin");

    const confirmed = window.confirm(
      isAdmin
        ? `¿Quitar el rol de administrador a ${user.display_name || user.email}?`
        : `¿Convertir a ${user.display_name || user.email} en administrador?`
    );

    if (!confirmed) return;

    setUpdating(user.user_id);
    setError("");
    setMessage("");

    const { error } = await supabase.rpc(
      "admin_set_admin_role",
      {
        _target_user_id: user.user_id,
        _enabled: !isAdmin,
      }
    );

    if (error) {
      setError(
        error.message || "No se pudo modificar el rol."
      );
    } else {
      setMessage(
        isAdmin
          ? "Se quitó el rol de administrador."
          : "El usuario ahora es administrador."
      );

      await loadUsers();
    }

    setUpdating(null);
  }

  const filteredUsers = users.filter((user) => {
    const term = search.toLowerCase();

    return (
      (user.display_name || "").toLowerCase().includes(term) ||
      (user.email || "").toLowerCase().includes(term)
    );
  });

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <p className="eyebrow">PANEL DE ADMINISTRACIÓN</p>
          <h1>Gestión de usuarios</h1>
          <p>Administración de cuentas y permisos.</p>
        </div>

        <Link
          href="/admin/dashboard"
          className="admin-back-link"
        >
          ← Volver al panel
        </Link>
      </div>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Usuarios registrados ({users.length})</h2>
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre o correo..."
          className="w-full rounded-lg border border-[#d4af37]/20 bg-black/20 px-4 py-3 text-white outline-none focus:border-[#d4af37]"
        />

        {error && (
          <p className="admin-error mt-4">{error}</p>
        )}

        {message && (
          <p className="admin-success mt-4">{message}</p>
        )}

        {loading ? (
          <p className="mt-6">Cargando usuarios...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="mt-6">
            No se encontraron usuarios.
          </p>
        ) : (
          <div className="admin-news-list">
            {filteredUsers.map((user) => {
              const isSuperAdmin =
                user.roles.includes("superadmin");

              const isAdmin =
                user.roles.includes("admin");

              return (
                <article
                  key={user.user_id}
                  className="admin-news-item"
                >
                  <div className="min-w-0 flex-1">
                    <strong className="block break-words">
                      {user.display_name || "Sin nombre"}
                      <RoleStars roles={user.roles} />
                    </strong>

                    <p className="mt-1 break-all text-sm opacity-70">
                      {user.email || "Correo no disponible"}
                    </p>

                    <p className="mt-2 text-xs opacity-60">
                      Registro:{" "}
                      {new Date(user.created_at).toLocaleDateString(
                        "es-AR"
                      )}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {isSuperAdmin && (
                        <span className="rounded-full border border-purple-400/40 px-3 py-1 text-xs text-purple-300">
                          Superadministrador
                        </span>
                      )}

                      {isAdmin && (
                        <span className="rounded-full border border-[#d4af37]/40 px-3 py-1 text-xs text-[#d4af37]">
                          Administrador
                        </span>
                      )}

                      {!isAdmin && !isSuperAdmin && (
                        <span className="rounded-full border border-white/15 px-3 py-1 text-xs opacity-70">
                          Usuario
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isSuperAdmin ? (
                      <span className="text-xs opacity-60">
                        Cuenta protegida
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={updating === user.user_id}
                        onClick={() => toggleAdmin(user)}
                        className="rounded-lg border border-[#d4af37]/40 px-4 py-2 text-sm text-[#d4af37] transition hover:bg-[#d4af37]/10 disabled:opacity-50"
                      >
                        {updating === user.user_id
                          ? "Actualizando..."
                          : isAdmin
                            ? "Quitar administrador"
                            : "Hacer administrador"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}