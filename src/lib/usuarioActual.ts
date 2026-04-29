import { supabase } from "@/lib/supabase";

export type UsuarioActual = {
  email: string;
  nombre: string;
  rol: string;
};

export async function obtenerUsuarioActual(): Promise<UsuarioActual | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return null;
  }

  const { data, error } = await supabase
    .from("usuarios_autorizados")
    .select("email, nombre, rol, activo")
    .eq("email", user.email)
    .eq("activo", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    email: data.email,
    nombre: data.nombre,
    rol: data.rol,
  };
}
