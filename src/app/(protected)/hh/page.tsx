"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function HandheldHomePage() {
  const router = useRouter();
  const supabase = createClient();

  const opciones = [
    {
      titulo: "Consultar inventario",
      descripcion: "Busca o escanea un artículo para ver existencias.",
      href: "/hh/inventario",
      icono: "📦",
    },
    {
      titulo: "Registrar salida",
      descripcion: "Escanea un artículo y registra una salida rápida.",
      href: "/hh/salida",
      icono: "📤",
    },
    {
      titulo: "Registrar devolución",
      descripcion: "Escanea y registra devoluciones de forma rápida.",
      href: "/hh/devolucion",
      icono: "📥",
    },
  ];

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error cerrando sesión:", error);
      alert("No se pudo cerrar la sesión correctamente.");
      return;
    }

    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-[#e7ecef] px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col">
        <div className="mb-6 rounded-3xl bg-[#264f63] p-5 text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            Handheld
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">
            Ingeniería System
          </h1>
          <p className="mt-3 text-sm text-white/80">
            Acceso rápido para inventario, salidas y devoluciones por escaneo.
          </p>
        </div>

        <div className="space-y-4">
          {opciones.map((opcion) => (
            <Link
              key={opcion.href}
              href={opcion.href}
              className="block rounded-3xl bg-white p-5 shadow-md transition active:scale-[0.99]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#eef2f4] text-2xl">
                  {opcion.icono}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-[#111111]">
                    {opcion.titulo}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-[#5f6b73]">
                    {opcion.descripcion}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-auto pt-6">
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 py-4 text-center text-base font-semibold text-[#264f63] shadow-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
