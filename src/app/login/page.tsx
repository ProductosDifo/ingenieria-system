"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [loadingMicrosoft, setLoadingMicrosoft] = useState(false);

  const handleMicrosoftLogin = async () => {
    try {
      setLoadingMicrosoft(true);

     const { error } = await supabase.auth.signInWithOAuth({
  provider: "azure",
  options: {
    redirectTo: "https://ingenieria-system.vercel.app/auth/callback",
    scopes: "email",
    queryParams: {
      prompt: "login",
    },
  },
});



      if (error) {
        console.error("Error iniciando sesión con Microsoft:", error);
        alert(error.message || "No se pudo iniciar sesión con Microsoft 365.");
      }
    } catch (error) {
      console.error("Error inesperado en login Microsoft:", error);
      alert("Ocurrió un error al iniciar sesión.");
    } finally {
      setLoadingMicrosoft(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e7ecef] px-4 py-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
        <div className="hidden bg-[#264f63] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-8 flex items-center gap-4">
              <Image
                src="/images/logo-ingenik2.png"
                alt="Logo Ingenieria"
                width={60}
                height={60}
                className="rounded-xl bg-white p-1"
              />

              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-white/70">
                  Sistema interno Progenik
                </p>

                <h1 className="text-2xl font-bold">Ingeniería System</h1>
              </div>
            </div>

            <p className="text-sm uppercase tracking-[0.25em] text-white/70">
              Control de inventario y movimientos
            </p>

            <h2 className="mt-4 text-4xl font-bold leading-tight">
              Gestión de salidas,
              <br />
              entradas e inventario
            </h2>

            <div className="mt-6">
              <Image
                src="/images/logo-netsuite2.png"
                alt="Logo Netsuite"
                width={140}
                height={60}
                className="opacity-90"
              />
            </div>

            <p className="mt-6 max-w-md text-base leading-relaxed text-white/80">
              Administra materiales, refacciones, consumibles y herramientas
              con trazabilidad por usuario, área y movimiento.
            </p>
          </div>
        </div>

        <div className="bg-[#f7f8fa] p-8 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#2f5b72]">
                Acceso al sistema
              </p>

              <h2 className="text-3xl font-bold text-[#111111]">
                Iniciar sesión
              </h2>

              <p className="mt-2 text-sm text-[#5f6b73]">
                Ingresa con tu cuenta corporativa de Microsoft 365 para acceder
                al sistema de ingeniería y control de inventario.
              </p>
            </div>

            <div className="space-y-5">
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={loadingMicrosoft}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#264f63] px-5 py-3 font-semibold text-white transition hover:bg-[#2f5b72] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="text-lg">Ⓜ</span>
                {loadingMicrosoft
                  ? "Redirigiendo a Microsoft..."
                  : "Iniciar sesión con Microsoft 365"}
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-[#d7dde1] bg-[#eef2f4] p-4 text-sm text-[#4f5b63]">
              Acceso exclusivo para usuarios autorizados de la empresa.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
