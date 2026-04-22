"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SelectDevicePage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e7ecef] px-4 py-8">
      <div className="w-full max-w-4xl rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Image
              src="/images/logo-ingenik2.png"
              alt="Logo Ingeniería"
              width={70}
              height={70}
              className="rounded-2xl bg-[#264f63]/10 p-2"
            />
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2f5b72]">
            Acceso al sistema
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#111111]">
            Selecciona el entorno de trabajo
          </h1>

          <p className="mt-3 text-sm text-[#5f6b73]">
            Elige cómo deseas ingresar al sistema de ingeniería.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-3xl border border-[#d7dde1] bg-[#f7f8fa] p-8 text-left shadow-sm transition hover:border-[#264f63] hover:bg-white hover:shadow-md"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2f5b72]">
              Escritorio
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#111111]">
              Panel completo
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#5f6b73]">
              Accede al dashboard, reportes, consultas, movimientos y administración
              general del sistema.
            </p>
          </button>

          <button
            type="button"
            onClick={() => router.push("/hh")}
            className="rounded-3xl border border-[#d7dde1] bg-[#f7f8fa] p-8 text-left shadow-sm transition hover:border-[#264f63] hover:bg-white hover:shadow-md"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2f5b72]">
              Handheld
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#111111]">
              Operación móvil
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#5f6b73]">
              Ingresa al módulo para consulta rápida, escaneo y registro de
              movimientos desde handheld.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
