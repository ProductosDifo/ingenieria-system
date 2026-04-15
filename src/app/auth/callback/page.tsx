"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Perfil = {
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
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Error obteniendo sesión:", sessionError);
          router.replace("/login");
          return;
        }

        const email = session?.user?.email?.toLowerCase().trim();

        if (!email) {
          router.replace("/login");
          return;
        }

        const { data: perfil, error: perfilError } = await supabase
          .from("perfiles")
          .select("email, nombre, rol, activo")
          .eq("email", email)
          .single<Perfil>();

        if (perfilError || !perfil || perfil.activo === false) {
          console.error("Usuario no autorizado o sin perfil:", perfilError);
          await supabase.auth.signOut();
          alert("Tu usuario no está autorizado para entrar al sistema.");
          router.replace("/login");
          return;
        }

        if (perfil.rol === "handheld") {
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
