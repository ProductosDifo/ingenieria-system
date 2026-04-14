"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const menuClass = (path: string) =>
    `block rounded-2xl px-4 py-3 transition ${
      pathname === path
        ? "bg-white font-semibold text-[#264f63]"
        : "text-white/85 hover:bg-white/10"
    }`;

  return (
    <aside className="flex w-[290px] flex-col bg-[#264f63] text-white shadow-xl">
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

        <h2 className="text-2xl font-bold">Ingeniería System</h2>
        <p className="mt-2 text-sm text-white/70">
          Control de inventario, salidas, préstamos y devoluciones
        </p>
      </div>

      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          <li>
            <a href="/dashboard" className={menuClass("/dashboard")}>
              Inicio
            </a>
          </li>

          <li>
            <a
              href="/registrar-devolucion"
              className={menuClass("/registrar-devolucion")}
            >
              Registrar devolución
            </a>
          </li>

          <li>
            <a
              href="/registrar-salida"
              className={menuClass("/registrar-salida")}
            >
              Registrar salida
            </a>
          </li>

          <li className="mt-4 border-t border-white/10" />

           <li>
            <a
              href="/consultar-inventario"
              className={menuClass("/consultar-inventario")}
            >
              Consultar inventario
            </a>
          </li>

          <li>
            <a
              href="/consultar-salidas"
              className={menuClass("/consultar-salidas")}
            >
              Consultar salidas
            </a>
          </li>

          <li>
            <a
              href="/consultar-prestamos"
              className={menuClass("/consultar-prestamos")}
            >
              Consultar préstamos
            </a>
          </li>

          <li>
            <a
              href="/consultar-devoluciones"
              className={menuClass("/consultar-devoluciones")}
            >
              Consultar devoluciones
            </a>
          </li>

          <li className="mt-4 border-t border-white/10" />

          <li>
            <a
              href="/actualizar-inventarios-netsuite"
              className={menuClass("/actualizar-inventarios-netsuite")}
            >
              Actualizar inventarios con NetSuite
            </a>
          </li>

          <li className="pt-4">
            <button
              onClick={() => router.push("/login")}
              className="w-full rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Cerrar sesión
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}