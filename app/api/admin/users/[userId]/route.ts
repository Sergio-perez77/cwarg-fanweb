import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";



type RouteContext = {
  params: Promise<{ userId: string }>;
};

async function listAllFiles(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  folder: string
) {
  const files: string[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(folder, { limit, offset });

    if (error) throw new Error(`No se pudo revisar ${bucket}.`);

    files.push(
      ...(data ?? [])
        .filter((file) => file.name && !file.id?.startsWith("folder"))
        .map((file) => `${folder}/${file.name}`)
    );

    if (!data || data.length < limit) break;
    offset += limit;
  }

  return files;
}

async function removeFiles(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  paths: string[]
) {
  const uniquePaths = [...new Set(paths)];

  for (let i = 0; i < uniquePaths.length; i += 100) {
    const { error } = await admin.storage
      .from(bucket)
      .remove(uniquePaths.slice(i, i + 100));

    if (error) {
      throw new Error(`No se pudieron eliminar archivos de ${bucket}.`);
    }
  }
}

function getAvatarPath(url: string | null, userId: string) {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    const marker =
      "/storage/v1/object/public/profile-avatars/";

    const index = parsedUrl.pathname.indexOf(marker);
    if (index === -1) return null;

    const path = decodeURIComponent(
      parsedUrl.pathname.slice(index + marker.length)
    );

    return path.startsWith(`${userId}/`) ? path : null;
  } catch {
    return null;
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { userId } = await context.params;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId
      )
    ) {
      return NextResponse.json(
        { error: "Identificador de usuario inválido." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user: actor },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !actor) {
      return NextResponse.json(
        { error: "Debés iniciar sesión." },
        { status: 401 }
      );
    }

    if (actor.id === userId) {
      return NextResponse.json(
        { error: "No podés eliminar tu propia cuenta desde este panel." },
        { status: 403 }
      );
    }

    const { data: actorRoles, error: actorRolesError } =
      await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", actor.id);

    if (actorRolesError) {
      return NextResponse.json(
        { error: "No se pudieron verificar tus permisos." },
        { status: 500 }
      );
    }

    const isSuperAdmin = actorRoles?.some(
      (item) => item.role === "superadmin"
    );
    const isAdmin = actorRoles?.some(
      (item) => item.role === "admin"
    );

    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: "No tenés permisos para esta operación." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const {
      data: targetData,
      error: targetError,
    } = await admin.auth.admin.getUserById(userId);

    if (targetError || !targetData.user) {
      return NextResponse.json(
        { error: "No se encontró la cuenta seleccionada." },
        { status: 404 }
      );
    }

    const [
      { data: targetRoles, error: targetRolesError },
      { data: profile, error: profileError },
      { data: posts, error: postsError },
    ] = await Promise.all([
      admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId),
      admin
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle(),
      admin
        .from("user_posts")
        .select("media_path")
        .eq("user_id", userId),
    ]);

    if (targetRolesError || profileError || postsError) {
      return NextResponse.json(
        { error: "No se pudieron verificar los datos de la cuenta." },
        { status: 500 }
      );
    }

    const targetIsSuperAdmin = targetRoles?.some(
      (item) => item.role === "superadmin"
    );
    const targetIsAdmin = targetRoles?.some(
      (item) => item.role === "admin"
    );

    if (targetIsSuperAdmin) {
      return NextResponse.json(
        { error: "No se puede eliminar una cuenta superadmin." },
        { status: 403 }
      );
    }

    if (targetIsAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Solo el superadmin puede eliminar administradores." },
        { status: 403 }
      );
    }

    const { data: audit, error: auditError } = await admin
      .from("account_deletion_logs")
      .insert({
        target_user_id: userId,
        target_email: targetData.user.email ?? null,
        target_display_name: profile?.display_name ?? null,
        deleted_by: actor.id,
      })
      .select("id")
      .single();

    if (auditError || !audit) {
      return NextResponse.json(
        { error: "No se pudo registrar la operación de auditoría." },
        { status: 500 }
      );
    }

    try {
      const postFiles = await listAllFiles(
        admin,
        "user-posts",
        userId
      );

      const avatarFiles = await listAllFiles(
        admin,
        "profile-avatars",
        userId
      );

      const avatarPath = getAvatarPath(
        profile?.avatar_url ?? null,
        userId
      );

      if (avatarPath) avatarFiles.push(avatarPath);

      const databasePostFiles = (posts ?? [])
        .map((post) => post.media_path)
        .filter(
          (path): path is string =>
            typeof path === "string" &&
            path.startsWith(`${userId}/`)
        );

      await removeFiles(admin, "user-posts", [
        ...postFiles,
        ...databasePostFiles,
      ]);

      await removeFiles(
        admin,
        "profile-avatars",
        avatarFiles
      );
    } catch (storageError) {
      await admin
        .from("account_deletion_logs")
        .delete()
        .eq("id", audit.id);

      return NextResponse.json(
        {
          error:
            storageError instanceof Error
              ? storageError.message
              : "No se pudieron limpiar los archivos de la cuenta.",
        },
        { status: 500 }
      );
    }

    const { error: deleteError } =
      await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      await admin
        .from("account_deletion_logs")
        .delete()
        .eq("id", audit.id);

      return NextResponse.json(
        {
          error:
            "No se pudo eliminar la cuenta. Los archivos asociados ya fueron limpiados.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "La cuenta fue eliminada correctamente.",
    });
  } catch {
    return NextResponse.json(
      { error: "Ocurrió un error interno al procesar la solicitud." },
      { status: 500 }
    );
  }
}