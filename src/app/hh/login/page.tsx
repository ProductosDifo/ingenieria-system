"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function HandheldLoginPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!usuario.trim() || !password.trim()) {
      alert("Captura usuario y contraseña.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      if (usuario !== "admin@productosdifo.com" || password !== "123456") {
        alert("Credenciales incorrectas.");
        setLoading(false);
        return;
      }

      router.push("/hh");
    }, 500);
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
              Accede para consultar inventario y registrar movimientos.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#111111]">
                Usuario
              </label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Usuario"
                className="min-h-[56px] w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 text-base text-[#111111] outline-none transition focus:border-[#264f63]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#111111]">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="min-h-[56px] w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 text-base text-[#111111] outline-none transition focus:border-[#264f63]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="min-h-[56px] w-full rounded-2xl bg-[#264f63] px-5 text-base font-semibold text-white transition hover:bg-[#2f5b72] disabled:opacity-50"
            >
              {loading ? "Ingresando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-5 rounded-2xl bg-[#eef2f4] p-4 text-sm text-[#4f5b63]">
            Demo: <span className="font-semibold">admin@productosdifo.com</span> /{" "}
            <span className="font-semibold">123456</span>
          </div>
        </div>

      
      </div>
    </div>
  );
}