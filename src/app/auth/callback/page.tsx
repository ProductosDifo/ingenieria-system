"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UsuarioAutorizado = {
  email: string;
  nombre: string | null;
  rol: "admin" | "almacen" | "handheld";
  activo: boolean;
};

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function procesarLogin() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        const code = searchParams.get("code");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("Error intercambiando code por sesión:", exchangeError);
            router.replace("/login");
            return;
          }
        } else if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) {
            console.error("Error guardando sesión desde hash:", setSessionError);
            router.replace("/login");
            return;
          }
        } else {
          console.error("No llegó ni code ni tokens al callback.");
          router.replace("/login");
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Error obteniendo sesión:", sessionError);
          router.replace("/login");
          return;
        }

        if (!session) {
          console.error("No se generó sesión después del callback.");
          router.replace("/login");
          return;
        }

        const userId = session.user.id;
        const email = session.user.email?.toLowerCase().trim();

        if (!email) {
          console.error("La sesión no contiene email.");
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        const { data: autorizado, error: autorizadoError } = await supabase
          .from("usuarios_autorizados")
          .select("email, nombre, rol, activo")
          .eq("email", email)
          .single<UsuarioAutorizado>();

        if (autorizadoError || !autorizado || autorizado.activo === false) {
          console.error("Usuario no autorizado:", autorizadoError);
          await supabase.auth.signOut();
          alert("Tu usuario no está autorizado para entrar al sistema.");
          router.replace("/login");
          return;
        }

        const { error: upsertPerfilError } = await supabase
          .from("perfiles")
          .upsert(
            {
              id: userId,
              email: autorizado.email,
              nombre: autorizado.nombre,
              rol: autorizado.rol,
              activo: autorizado.activo,
            },
            {
              onConflict: "id",
            }
          );

        if (upsertPerfilError) {
          console.error("Error creando/actualizando perfil:", upsertPerfilError);
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        if (autorizado.rol === "handheld") {
          router.replace("/hh");
          return;
        }

        router.replace("/dashboard");
      } catch (error) {
        console.error("Error en callback de autenticación:", error);
        router.replace("/login");
      }
    }

    procesarLogin();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e7ecef]">
      <div className="rounded-2xl bg-white px-6 py-4 shadow-md">
        <p className="text-sm font-semibold text-[#264f63]">
          Iniciando sesión...
        </p>
      </div>
    </div>
  );
}
