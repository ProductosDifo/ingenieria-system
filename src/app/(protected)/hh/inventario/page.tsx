"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type InventarioItem = {
  id: number;
  codigo_barras: string | null;
  nombre: string;
  descripcion: string | null;
  tipo: string | null;
  ubicacion: string | null;
  existencia: number | null;
  costo_unitario: number | null;
  valor_fisico: number | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
}

export default function HHInventarioPage() {
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<InventarioItem | null>(null);
  const [resultados, setResultados] = useState<InventarioItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (seleccionado) return;

    const timer = setTimeout(async () => {
      try {
        setCargando(true);

        let query = supabase
          .from("articulos")
          .select(
            "id, codigo_barras, nombre, descripcion, tipo, ubicacion, existencia, costo_unitario, valor_fisico"
          )
          .order("nombre", { ascending: true })
          .limit(10);

        const texto = busqueda.trim();

        if (texto) {
          query = query.or(
            `codigo_barras.ilike.%${texto}%,nombre.ilike.%${texto}%,descripcion.ilike.%${texto}%,tipo.ilike.%${texto}%,ubicacion.ilike.%${texto}%`
          );
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error cargando inventario HH:", error);
          setResultados([]);
          return;
        }

        setResultados((data || []) as InventarioItem[]);
      } finally {
        setCargando(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [busqueda, seleccionado]);

  const buscarPrimerResultado = async () => {
    const texto = busqueda.trim();

    if (!texto) return;

    try {
      setCargando(true);

      const codigoLimpio = texto.split(" - ")[0].trim();

      const { data, error } = await supabase
        .from("articulos")
        .select(
          "id, codigo_barras, nombre, descripcion, tipo, ubicacion, existencia, costo_unitario, valor_fisico"
        )
        .eq("codigo_barras", codigoLimpio)
        .order("ubicacion", { ascending: true });

      if (error) {
        console.error("Error buscando artículo exacto:", error);
        alert("Error buscando el artículo.");
        return;
      }

      if (data && data.length > 0) {
        const articulos = data as InventarioItem[];

        if (articulos.length === 1) {
          const articulo = articulos[0];

          setSeleccionado(articulo);
          setBusqueda(
            `${articulo.codigo_barras || "SIN-CODIGO"} - ${articulo.nombre}`
          );
          setResultados([articulo]);
          return;
        }

        setSeleccionado(null);
        setResultados(articulos);
        return;
      }

      const encontrado = resultados[0];

      if (encontrado) {
        setSeleccionado(encontrado);
        setBusqueda(
          `${encontrado.codigo_barras || "SIN-CODIGO"} - ${encontrado.nombre}`
        );
      } else {
        setSeleccionado(null);
        alert("No se encontró ningún artículo con ese código.");
      }
    } finally {
      setCargando(false);
    }
  };

  const seleccionarItem = (item: InventarioItem) => {
    setSeleccionado(item);
    setBusqueda(`${item.codigo_barras || "SIN-CODIGO"} - ${item.nombre}`);
    setResultados([item]);
  };

  const limpiar = () => {
    setBusqueda("");
    setSeleccionado(null);
    setResultados([]);
    inputRef.current?.focus();
  };

  const existencia = Number(seleccionado?.existencia || 0);
  const costoUnitario = Number(seleccionado?.costo_unitario || 0);
  const valorFisico =
    seleccionado?.valor_fisico !== null &&
    seleccionado?.valor_fisico !== undefined
      ? Number(seleccionado.valor_fisico)
      : existencia * costoUnitario;

  const mostrarResultados = busqueda.trim().length > 0 && !seleccionado;

  return (
    <div className="min-h-screen bg-[#e7ecef] px-4 py-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-3xl bg-[#264f63] p-5 text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            Handheld
          </p>
          <h1 className="mt-2 text-3xl font-bold">Consultar inventario</h1>
          <p className="mt-2 text-sm text-white/80">
            Escanea o busca un artículo para consultar existencias reales.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-md">
          <label className="mb-2 block text-sm font-semibold text-[#111111]">
            Código o artículo
          </label>

          <div className="space-y-3">
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                if (seleccionado) {
                  setSeleccionado(null);
                  setResultados([]);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  buscarPrimerResultado();
                }
              }}
              placeholder="Escanea o escribe aquí"
              className="min-h-[58px] w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 text-base text-[#111111] outline-none transition focus:border-[#264f63]"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={buscarPrimerResultado}
                className="min-h-[52px] rounded-2xl bg-[#264f63] px-4 text-base font-semibold text-white transition hover:bg-[#2f5b72]"
              >
                Buscar
              </button>

              <button
                onClick={limpiar}
                className="min-h-[52px] rounded-2xl border border-[#cfd4d8] bg-white px-4 text-base font-semibold text-[#264f63]"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {mostrarResultados && (
          <div className="rounded-3xl bg-white p-4 shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#111111]">
                Coincidencias
              </h2>
              <span className="text-sm text-[#5f6b73]">
                {cargando ? "..." : resultados.length}
              </span>
            </div>

            <div className="space-y-3">
              {cargando ? (
                <div className="rounded-2xl bg-[#f7f8fa] px-4 py-4 text-sm text-[#5f6b73]">
                  Cargando artículos...
                </div>
              ) : resultados.length === 0 ? (
                <div className="rounded-2xl bg-[#f7f8fa] px-4 py-4 text-sm text-[#5f6b73]">
                  No se encontraron artículos.
                </div>
              ) : (
                resultados.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => seleccionarItem(item)}
                    className="block w-full rounded-2xl border border-[#e4e8eb] bg-[#f7f8fa] px-4 py-4 text-left transition active:scale-[0.99]"
                  >
                    <p className="font-semibold text-[#264f63]">
                      {item.codigo_barras || "SIN-CODIGO"}
                    </p>

                    <p className="mt-1 text-base font-semibold text-[#111111]">
                      {item.nombre}
                    </p>

                    <p className="mt-1 text-sm text-[#5f6b73]">
                      {item.descripcion}
                    </p>

                    <p className="mt-2 inline-flex rounded-full bg-[#e7ecef] px-3 py-1 text-xs font-semibold text-[#264f63]">
                      {item.ubicacion || "SIN UBICACIÓN"}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[#111111]">
                      Existencia: {Number(item.existencia || 0)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {seleccionado && (
          <div className="rounded-3xl bg-white p-5 shadow-md">
            <p className="text-sm font-semibold text-[#264f63]">
              {seleccionado.codigo_barras || "SIN-CODIGO"}
            </p>

            <h2 className="mt-1 text-2xl font-bold text-[#111111]">
              {seleccionado.nombre}
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-[#5f6b73]">
              {seleccionado.descripcion}
            </p>

            <p className="mt-2 inline-flex rounded-full bg-[#e7ecef] px-3 py-1 text-xs font-semibold text-[#264f63]">
              {seleccionado.ubicacion || "SIN UBICACIÓN"}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f7f8fa] p-4">
                <p className="text-xs text-[#5f6b73]">Tipo</p>
                <p className="mt-2 text-base font-bold text-[#111111]">
                  {seleccionado.tipo || ""}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f7f8fa] p-4">
                <p className="text-xs text-[#5f6b73]">Existencia</p>
                <p className="mt-2 text-2xl font-bold text-[#264f63]">
                  {existencia}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f7f8fa] p-4">
                <p className="text-xs text-[#5f6b73]">Costo unitario</p>
                <p className="mt-2 text-base font-bold text-[#111111]">
                  {formatCurrency(costoUnitario)}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f7f8fa] p-4">
                <p className="text-xs text-[#5f6b73]">Valor físico</p>
                <p className="mt-2 text-base font-bold text-[#111111]">
                  {formatCurrency(valorFisico)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            href="/hh"
            className="rounded-2xl border border-[#cfd4d8] bg-white px-4 py-4 text-center text-base font-semibold text-[#264f63] shadow-sm"
          >
            Menú HH
          </Link>

          <Link
            href="/hh/salida"
            className="rounded-2xl bg-[#264f63] px-4 py-4 text-center text-base font-semibold text-white shadow-sm"
          >
            Ir a salidas
          </Link>
        </div>
      </div>
    </div>
  );
}
