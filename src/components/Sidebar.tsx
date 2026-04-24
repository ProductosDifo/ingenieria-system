"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type MenuItem = {
  href: string;
  label: string;
  icon: string;
};

const movimientos: MenuItem[] = [
  { href: "/dashboard", label: "Inicio", icon: "🏠" },
  { href: "/registrar-devolucion", label: "Registrar devolución", icon: "📥" },
  { href: "/registrar-salida", label: "Registrar salida", icon: "📤" },
];

const consultas: MenuItem[] = [
  { href: "/consultar-inventario", label: "Consultar inventario", icon: "📦" },
  { href: "/consultar-salidas", label: "Consultar salidas", icon: "📋" },
  { href: "/consultar-prestamos", label: "Consultar préstamos", icon: "🧰" },
  { href: "/consultar-devoluciones", label: "Consultar devoluciones", icon: "↩️" },
];

const integraciones: MenuItem[] = [
  {
    href: "/actualizar-inventarios-netsuite",
    label: "Actualizar inventarios con NetSuite",
    icon: "🔄",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const menuClass = (path: string) =>
    `group flex h-[56px] w-full items-center gap-3 rounded-2xl px-4 text-sm transition ${
      pathname === path
        ? "bg-white font-semibold text-[#264f63] shadow-md"
        : "text-white/85 hover:bg-white/10 hover:text-white"
    }`;

  const renderItem = (item: MenuItem) => (
    <li key={item.href}>
      <Link href={item.href} className={menuClass(item.href)}>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base transition ${
            pathname === item.href
              ? "bg-[#264f63]/10"
              : "bg-white/10 group-hover:bg-white/15"
          }`}
        >
          {item.icon}
        </span>

        <span className="leading-5">{item.label}</span>
      </Link>
    </li>
  );

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
    <aside className="flex w-[320px] shrink-0 flex-col bg-gradient-to-b from-[#173a4a] via-[#264f63] to-[#1f4254] text-white shadow-2xl">
      <div className="border-b border-white/10 px-7 py-7">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-lg">
            <Image
              src="/images/logo-ingenik.png"
              alt="Logo Progenik"
              width={58}
              height={58}
              className="object-contain"
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
              Sistema interno
            </p>
            <h2 className="mt-1 text-xl font-bold leading-tight">
              Ingeniería
            </h2>
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
          <p className="text-sm font-semibold text-white">Control operativo</p>
          <p className="mt-1 text-xs leading-5 text-white/65">
            Inventario, salidas, préstamos y devoluciones.
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-5">
          <section>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">
              Movimientos
            </p>
            <ul className="space-y-2">{movimientos.map(renderItem)}</ul>
          </section>

          <section>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">
              Consultas
            </p>
            <ul className="space-y-2">{consultas.map(renderItem)}</ul>
          </section>

          <section>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">
              Integraciones
            </p>
            <ul className="space-y-2">{integraciones.map(renderItem)}</ul>
          </section>
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="flex h-[56px] w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <span>🚪</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
