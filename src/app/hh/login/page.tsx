"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function HandheldLoginPage() {
  const [loadingMicrosoft, setLoadingMicrosoft] = useState(false);

  const handleMicrosoftLogin = async () => {
    try {
      setLoadingMicrosoft(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: "https://ingenieria-system.vercel.app/auth/callback",
        },
      });

      if (error) {
        console.error("Error iniciando sesión HH con Microsoft:", error);
        alert(error.message || "No se pudo iniciar sesión con Microsoft 365.");
      }
    } catch (error) {
      console.error("Error inesperado en login HH:", error);
      alert("Ocurrió un error al iniciar sesión.");
    } finally {
      setLoadingMicrosoft(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e7ecef] px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col justify-center">
        <div className="rounded-3xl bg-white p-6 shadow-xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#264f63]/10 p-3">
              <Image
                src="/images/logo-ingenik2.png"
                alt="Logo Progenik"
                width={52}
                height={52}
                className="object-contain"
              />
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f5b72]">
              Handheld
            </p>

            <h1 className="mt-2 text-3xl font-bold text-[#111111]">
              Ingeniería System
            </h1>

            <p className="mt-2 text-sm text-[#5f6b73]">
              Accede con tu cuenta corporativa para consultar inventario y
              registrar movimientos.
            </p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={loadingMicrosoft}
              className="flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl bg-[#264f63] px-5 text-base font-semibold text-white transition hover:bg-[#2f5b72] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="text-lg">Ⓜ</span>
              {loadingMicrosoft
                ? "Redirigiendo a Microsoft..."
                : "Entrar con Microsoft 365"}
            </button>
          </div>

          <div className="mt-5 rounded-2xl bg-[#eef2f4] p-4 text-sm text-[#4f5b63]">
            Acceso exclusivo para usuarios autorizados del módulo handheld.
          </div>
        </div>
      </div>
    </div>
  );
}
