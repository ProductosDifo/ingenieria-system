"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const menuClass = (path: string) =>
    `flex h-[56px] w-full items-center rounded-2xl px-4 text-sm transition ${
      pathname === path
        ? "bg-white font-semibold text-[#264f63] shadow-sm"
        : "text-white/85 hover:bg-white/10"
    }`;

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error cerrando sesión:", error);
        alert("No se pudo cerrar la sesión correctamente.");
        return;
      }

      router.replace("/login");
    } catch (error) {
      console.error("Error inesperado al cerrar sesión:", error);
      router.replace("/login");
    }
  };

  return (
    <aside className="flex w-[320px] shrink-0 flex-col bg-[#264f63] text-white shadow-xl">
      <div className="border-b border-white/10 px-8 py-8">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 p-2">
          <Image
            src="/images/logo-ingenik.png"
            alt="Logo Progenik"
            width={60}
            height={60}
            className="object-contain"
          />
        </div>

        <h2 className="text-2xl font-bold leading-tight">Ingeniería System</h2>
        <p className="mt-2 text-sm leading-5 text-white/70">
          Control de inventario, salidas, préstamos y devoluciones
        </p>
      </div>

      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          <li>
            <Link href="/dashboard" className={menuClass("/dashboard")}>
              <span className="whitespace-nowrap">Inicio</span>
            </Link>
          </li>

          <li>
            <Link
              href="/registrar-devolucion"
              className={menuClass("/registrar-devolucion")}
            >
              <span className="whitespace-nowrap">Registrar devolución</span>
            </Link>
          </li>

          <li>
            <Link
              href="/registrar-salida"
              className={menuClass("/registrar-salida")}
            >
              <span className="whitespace-nowrap">Registrar salida</span>
            </Link>
          </li>

          <li className="my-4 border-t border-white/10" />

          <li>
            <Link
              href="/consultar-inventario"
              className={menuClass("/consultar-inventario")}
            >
              <span className="whitespace-nowrap">Consultar inventario</span>
            </Link>
          </li>

          <li>
            <Link
              href="/consultar-salidas"
              className={menuClass("/consultar-salidas")}
            >
              <span className="whitespace-nowrap">Consultar salidas</span>
            </Link>
          </li>

          <li>
            <Link
              href="/consultar-prestamos"
              className={menuClass("/consultar-prestamos")}
            >
              <span className="whitespace-nowrap">Consultar préstamos</span>
            </Link>
          </li>

          <li>
            <Link
              href="/consultar-devoluciones"
              className={menuClass("/consultar-devoluciones")}
            >
              <span className="whitespace-nowrap">Consultar devoluciones</span>
            </Link>
          </li>

          <li className="my-4 border-t border-white/10" />

          <li>
            <Link
              href="/actualizar-inventarios-netsuite"
              className={menuClass("/actualizar-inventarios-netsuite")}
            >
              <span className="leading-5">
                Actualizar inventarios con NetSuite
              </span>
            </Link>
          </li>

          <li className="pt-4">
            <button
              onClick={handleLogout}
              className="h-[56px] w-full rounded-2xl border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Cerrar sesión
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
