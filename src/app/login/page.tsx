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
          redirectTo: "https://app.ingenik.net/auth/callback",
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#e7ecef] px-4 py-8">
      <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#264f63]/20 blur-3xl" />
      <div className="absolute bottom-[-140px] right-[-120px] h-96 w-96 rounded-full bg-[#2f5b72]/20 blur-3xl" />

      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white/80 shadow-2xl ring-1 ring-white/60 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden bg-gradient-to-br from-[#143746] via-[#264f63] to-[#2f5b72] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-10 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-lg">
                <Image
                  src="/images/logo-ingenik2.png"
                  alt="Logo Ingeniería"
                  width={54}
                  height={54}
                  className="object-contain"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
                  Sistema interno
                </p>
                <h1 className="text-2xl font-bold">Ingeniería System</h1>
              </div>
            </div>

            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Control operativo
            </div>

            <h2 className="mt-6 max-w-xl text-5xl font-bold leading-tight">
              Gestión inteligente de inventario, salidas y devoluciones.
            </h2>

            <p className="mt-6 max-w-md text-base leading-relaxed text-white/75">
              Administra materiales, refacciones, consumibles y herramientas con
              trazabilidad por usuario, área, folio y movimiento.
            </p>

            <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-2xl font-bold">24/7</p>
                <p className="mt-1 text-xs text-white/65">Acceso web</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-2xl font-bold">HH</p>
                <p className="mt-1 text-xs text-white/65">Handheld</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-2xl font-bold">M365</p>
                <p className="mt-1 text-xs text-white/65">Login seguro</p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                Integración
              </p>
              <div className="mt-3">
                <Image
                  src="/images/logo-netsuite2.png"
                  alt="Logo NetSuite"
                  width={135}
                  height={55}
                  className="opacity-90"
                />
              </div>
            </div>

            <p className="max-w-[180px] text-right text-xs leading-relaxed text-white/50">
              Plataforma privada para usuarios autorizados.
            </p>
          </div>
        </div>

        <div className="flex items-center bg-[#f7f8fa] p-8 sm:p-10 lg:p-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Image
                src="/images/logo-ingenik2.png"
                alt="Logo Ingeniería"
                width={64}
                height={64}
                className="rounded-2xl bg-white p-2 shadow-md"
              />
            </div>

            <div className="mb-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#2f5b72]">
                Acceso seguro
              </p>

              <h2 className="text-4xl font-bold tracking-tight text-[#111111]">
                Iniciar sesión
              </h2>

              <p className="mt-4 text-sm leading-relaxed text-[#5f6b73]">
                Ingresa con tu cuenta corporativa de Microsoft 365 para acceder
                al sistema de ingeniería y control de inventario.
              </p>
            </div>

            <div className="rounded-3xl border border-[#d7dde1] bg-white p-5 shadow-sm">
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={loadingMicrosoft}
                className="flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl bg-[#264f63] px-5 text-base font-semibold text-white shadow-md transition hover:bg-[#2f5b72] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-sm font-bold text-[#264f63]">
                  M
                </span>
                {loadingMicrosoft
                  ? "Redirigiendo a Microsoft..."
                  : "Continuar con Microsoft 365"}
              </button>

              <div className="mt-5 rounded-2xl bg-[#eef2f4] p-4 text-sm leading-relaxed text-[#4f5b63]">
                Acceso exclusivo para usuarios autorizados de la empresa.
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-[#7b858c]">
              Ingeniería System · Powered by Ingenik
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
