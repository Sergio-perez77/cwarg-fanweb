"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type User = {
  user_id: string;
  email: string;
  display_name: string | null;
  roles: string[];
};

type Sanction = {
  id: string;
  target_user_id: string;
  created_by: string | null;
  reason: string;
  starts_at: string;
  ends_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
};

type Profile = {
  id: string;
  display_name: string | null;
};

type SancionesAdminClientProps = {
  isSuperAdmin: boolean;
};

export default function SancionesAdminClient({
  isSuperAdmin,
}: SancionesAdminClientProps) {
  const supabase = createClient();

  const [users, setUsers] = useState<User[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [selectedUser, setSelectedUser] = useState("");
  const [days, setDays] = useState("0");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("30");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const [usersResult, sanctionsResult] = await Promise.all([
      supabase.rpc("admin_list_sanction_targets"),
      supabase
        .from("account_sanctions")
        .select(
          "id,target_user_id,created_by,reason,starts_at,ends_at,revoked_at,revoked_by"
        )
        .order("created_at", { ascending: false }),
    ]);

    if (usersResult.error || sanctionsResult.error) {
      setMessage(
        usersResult.error?.message ||
          sanctionsResult.error?.message ||
          "No se pudieron cargar los datos."
      );
      setLoading(false);
      return;
    }

    const loadedUsers = (usersResult.data || []) as User[];
    const loadedSanctions = (sanctionsResult.data || []) as Sanction[];

    setUsers(loadedUsers);
    setSanctions(loadedSanctions);

    const ids = Array.from(
      new Set([
        ...loadedUsers.map((user) => user.user_id),
        ...loadedSanctions.flatMap((item) =>
          [item.target_user_id, item.created_by, item.revoked_by].filter(
            (id): id is string => Boolean(id)
          )
        ),
      ])
    );

    if (ids.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id,display_name")
        .in("id", ids);

      const names: Record<string, string> = {};

      ((profileData || []) as Profile[]).forEach((profile) => {
        names[profile.id] = profile.display_name || "Usuario";
      });

      setProfiles(names);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function issueSanction() {
    setMessage("");

    const durationDays = Number(days);
    const durationHours = Number(hours);
    const durationMinutes = Number(minutes);

    if (!selectedUser) {
      setMessage("Seleccioná un usuario.");
      return;
    }

    if (
      !Number.isInteger(durationDays) ||
      !Number.isInteger(durationHours) ||
      !Number.isInteger(durationMinutes) ||
      durationDays < 0 ||
      durationHours < 0 ||
      durationMinutes < 0 ||
      durationDays + durationHours + durationMinutes === 0
    ) {
      setMessage("Ingresá una duración válida mayor que cero.");
      return;
    }

    if (!reason.trim()) {
      setMessage("Ingresá el motivo de la sanción.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc("admin_issue_sanction", {
      _target_user_id: selectedUser,
      _days: durationDays,
      _hours: durationHours,
      _minutes: durationMinutes,
      _reason: reason.trim(),
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("La sanción se registró correctamente.");
      setSelectedUser("");
      setDays("0");
      setHours("0");
      setMinutes("30");
      setReason("");
      await loadData();
    }

    setSaving(false);
  }

  async function revokeSanction(id: string) {
    const confirmed = window.confirm(
      "¿Querés revocar esta sanción?"
    );

    if (!confirmed) return;

    setMessage("");
    setSaving(true);

    const { error } = await supabase.rpc("admin_revoke_sanction", {
      _sanction_id: id,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("La sanción fue revocada correctamente.");
      await loadData();
    }

    setSaving(false);
  }

  function sanctionStatus(sanction: Sanction) {
    if (sanction.revoked_at) return "Revocada";
    if (new Date(sanction.ends_at).getTime() <= Date.now()) {
      return "Vencida";
    }
    return "Activa";
  }

  if (loading) {
    return (
      <div className="p-6 text-gray-300">
        Cargando módulo de sanciones...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-4 text-white sm:p-6">
      <header>
        <h1 className="text-2xl font-bold">Administración de sanciones</h1>
        <p className="mt-2 text-sm text-gray-400">
          Aplicá restricciones temporales y consultá el historial de sanciones.
        </p>
      </header>

      <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
        <h2 className="mb-5 text-lg font-semibold">Emitir sanción</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Usuario
            </label>
            <select
              value={selectedUser}
              onChange={(event) => setSelectedUser(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-800 p-3"
            >
              <option value="">Seleccionar usuario...</option>
              {users.map((user) => (
                <option
                  key={user.user_id}
                  value={user.user_id}
                  disabled={!isSuperAdmin && user.roles?.includes("admin")}
                >
                  {user.display_name || user.email}
                  {user.roles?.includes("admin")
                    ? " (Administrador protegido)"
                    : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {isSuperAdmin
                ? "Podés sancionar cuentas normales y administradores."
                : "No podés sancionar a otros administradores."}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Duración
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <input
                  type="number"
                  min="0"
                  value={days}
                  onChange={(event) => setDays(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-800 p-3"
                />
                <span className="mt-1 block text-xs text-gray-400">
                  Días
                </span>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-800 p-3"
                />
                <span className="mt-1 block text-xs text-gray-400">
                  Horas
                </span>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-800 p-3"
                />
                <span className="mt-1 block text-xs text-gray-400">
                  Minutos
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Motivo
            </label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Describí el motivo de la sanción..."
              className="w-full rounded-lg border border-white/10 bg-slate-800 p-3"
            />
          </div>

          <button
            type="button"
            onClick={issueSanction}
            disabled={saving}
            className="rounded-lg bg-rose-700 px-5 py-3 font-medium hover:bg-rose-600 disabled:opacity-50"
          >
            {saving ? "Procesando..." : "Aplicar sanción"}
          </button>
        </div>
      </section>

      {message && (
        <p
          role="status"
          className="rounded-lg border border-white/10 bg-slate-800 p-3 text-sm"
        >
          {message}
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Historial de sanciones</h2>

        {sanctions.length === 0 ? (
          <p className="text-sm text-gray-400">
            Todavía no hay sanciones registradas.
          </p>
        ) : (
          sanctions.map((sanction) => {
            const status = sanctionStatus(sanction);
            const targetName =
              profiles[sanction.target_user_id] || "Usuario";
            const creatorName = sanction.created_by
              ? profiles[sanction.created_by] || "Administrador"
              : "Cuenta eliminada";

            return (
              <article
                key={sanction.id}
                className="rounded-xl border border-white/10 bg-slate-900 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold">{targetName}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      status === "Activa"
                        ? "bg-rose-900 text-rose-200"
                        : status === "Revocada"
                          ? "bg-amber-900 text-amber-200"
                          : "bg-slate-700 text-gray-300"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-300">
                  {sanction.reason}
                </p>

                <div className="mt-3 space-y-1 text-xs text-gray-400">
                  <p>Emitida por: {creatorName}</p>
                  <p>
                    Inicio: {new Date(sanction.starts_at).toLocaleString("es-AR")}
                  </p>
                  <p>
                    Finalización: {new Date(sanction.ends_at).toLocaleString("es-AR")}
                  </p>
                  {sanction.revoked_at && (
                    <p>
                      Revocada: {new Date(sanction.revoked_at).toLocaleString("es-AR")}
                    </p>
                  )}
                </div>

                {status === "Activa" && (
                  <button
                    type="button"
                    onClick={() => revokeSanction(sanction.id)}
                    disabled={saving}
                    className="mt-4 rounded-lg border border-amber-500/40 px-4 py-2 text-sm text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                  >
                    Revocar sanción
                  </button>
                )}
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}