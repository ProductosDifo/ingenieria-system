"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Registro = {
  salida_detalle_id: number;
  salida_id: number;
  folio: number;
  fecha: string;
  solicitante: string;
  area: string;
  ticket: string | null;
  articulo_id: number;
  codigo_barras: string | null;
  nombre: string;
  descripcion: string | null;
  tipo: string | null;
  ubicacion: string | null;
  cantidad_original: number;
  cantidad_devuelta: number;
  cantidad_pendiente: number;
};

function calcularDiasAtraso(fechaBase: string) {
  const hoy = new Date();
  const fecha = new Date(fechaBase);
  const diff = Math.floor(
    (hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diff > 0 ? diff : 0;
}

export default function HHDevolucionPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeout = useRef<NodeJS.Timeout | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [registroSeleccionado, setRegistroSeleccionado] =
    useState<Registro | null>(null);
  const [cantidadDevolver, setCantidadDevolver] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [folioDevolucion, setFolioDevolucion] = useState<number | null>(null);

  const formatearFolioSalida = (folio: number | null | undefined) => {
    if (folio === null || folio === undefined) return "";
    return `SAL-${String(folio).padStart(3, "0")}`;
  };

  const formatearFolioDevolucion = (folio: number | null | undefined) => {
    if (folio === null || folio === undefined) return "";
    return `DEV-${String(folio).padStart(3, "0")}`;
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setCargando(true);

        const { data, error } = await supabase.rpc(
          "buscar_registros_devolucion",
          {
            p_busqueda: busqueda.trim() || null,
          }
        );

        if (error) {
          console.error("Error cargando registros HH de devolución:", error);
          setRegistros([]);
          return;
        }

        setRegistros((data || []) as Registro[]);
      } finally {
        setCargando(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [busqueda]);

  const registrosFiltrados = useMemo(() => registros, [registros]);

  const cantidadPendiente = registroSeleccionado?.cantidad_pendiente ?? 0;

  const esHerramienta =
    registroSeleccionado?.tipo?.trim().toLowerCase() === "herramienta";

  const diasAtraso =
    registroSeleccionado && esHerramienta
      ? calcularDiasAtraso(registroSeleccionado.fecha)
      : 0;

  const seleccionarRegistro = (registro: Registro) => {
    setRegistroSeleccionado(registro);
    setBusqueda(
      `${formatearFolioSalida(registro.folio)} - ${
        registro.codigo_barras || "SIN-CODIGO"
      } - ${registro.nombre}`
    );
    setCantidadDevolver("");
    setObservaciones("");
    setMostrarResultados(false);
    setFolioDevolucion(null);
  };

  const buscarPrimerResultado = () => {
    if (!busqueda.trim()) return;

    const encontrado = registrosFiltrados[0];

    if (encontrado) {
      seleccionarRegistro(encontrado);
    } else {
      setRegistroSeleccionado(null);
      alert("No se encontró ningún registro.");
    }
  };

  const recargarPendientes = async () => {
    const { data, error } = await supabase.rpc("buscar_registros_devolucion", {
      p_busqueda: null,
    });

    if (error) {
      console.error("Error recargando pendientes HH:", error);
      return;
    }

    setRegistros((data || []) as Registro[]);
  };

  const limpiar = () => {
    setBusqueda("");
    setRegistroSeleccionado(null);
    setCantidadDevolver("");
    setObservaciones("");
    setMostrarResultados(false);
    setFolioDevolucion(null);
    inputRef.current?.focus();
  };

  const handleRegistrarDevolucion = async () => {
    if (guardando) return;

    if (!registroSeleccionado) {
      alert("Debes seleccionar un registro válido.");
      return;
    }

    const cantidad = Number(cantidadDevolver);

    if (!cantidadDevolver || Number.isNaN(cantidad) || cantidad <= 0) {
      alert("La cantidad a devolver debe ser mayor que 0.");
      return;
    }

    if (cantidad > cantidadPendiente) {
      alert("No puedes devolver más de la cantidad pendiente.");
      return;
    }

    try {
      setGuardando(true);

      const { data, error } = await supabase.rpc("registrar_devolucion", {
        p_salida_detalle_id: registroSeleccionado.salida_detalle_id,
        p_cantidad_devuelta: cantidad,
        p_observaciones: observaciones.trim() || null,
      });

      if (error) {
        console.error("Error registrando devolución HH:", error);
        alert(error.message || "No se pudo registrar la devolución.");
        return;
      }

      const resultado = Array.isArray(data) ? data[0] : data;
      const folio =
        resultado?.out_folio ??
        resultado?.folio ??
        resultado?.folio_devolucion ??
        null;

      setFolioDevolucion(folio);

      const folioFormateado = formatearFolioDevolucion(folio);

      alert(
        folioFormateado
          ? `Devolución registrada correctamente. Folio: ${folioFormateado}`
          : "Devolución registrada correctamente."
      );

      limpiar();
      await recargarPendientes();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e7ecef] px-4 py-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-3xl bg-[#264f63] p-5 text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            Handheld
          </p>
          <h1 className="mt-2 text-3xl font-bold">Registrar devolución</h1>
          <p className="mt-2 text-sm text-white/80">
            Escanea o busca el registro para devolver material o herramienta.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-md">
          <p className="mb-3 text-sm font-semibold text-[#111111]">
            Buscar registro
          </p>

          <div className="relative space-y-3">
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setMostrarResultados(true);

                if (registroSeleccionado) {
                  setRegistroSeleccionado(null);
                }
              }}
              onFocus={() => {
                if (blurTimeout.current) clearTimeout(blurTimeout.current);
                setMostrarResultados(true);
              }}
              onBlur={() => {
                blurTimeout.current = setTimeout(() => {
                  setMostrarResultados(false);
                }, 150);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  buscarPrimerResultado();
                }
              }}
              placeholder="Escanea folio, ticket o código"
              className="min-h-[58px] w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 text-base text-[#111111] outline-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={buscarPrimerResultado}
                className="min-h-[52px] rounded-2xl bg-[#264f63] px-4 text-base font-semibold text-white"
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

            {mostrarResultados && (
              <div className="absolute left-0 right-0 top-[118px] z-20 max-h-80 overflow-y-auto rounded-2xl border border-[#d7dde1] bg-white shadow-xl">
                {cargando ? (
                  <div className="px-4 py-4 text-sm text-[#5f6b73]">
                    Cargando registros...
                  </div>
                ) : registrosFiltrados.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-[#5f6b73]">
                    No se encontraron registros.
                  </div>
                ) : (
                  registrosFiltrados.map((registro) => {
                    const esHerramientaRegistro =
                      registro.tipo?.trim().toLowerCase() === "herramienta";

                    return (
                      <button
                        key={registro.salida_detalle_id}
                        type="button"
                        onMouseDown={() => seleccionarRegistro(registro)}
                        className="w-full border-b border-[#eef2f4] px-4 py-4 text-left transition hover:bg-[#f7f8fa]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-[#264f63]">
                              {formatearFolioSalida(registro.folio)} ·{" "}
                              {registro.codigo_barras || "SIN-CODIGO"}
                            </p>

                            <p className="mt-1 text-base font-semibold text-[#111111]">
                              {registro.nombre}
                            </p>

                            <p className="mt-1 text-sm text-[#5f6b73]">
                              {registro.solicitante} · {registro.area}
                            </p>

                            <p className="mt-2 inline-flex rounded-full bg-[#e7ecef] px-3 py-1 text-xs font-semibold text-[#264f63]">
                              {registro.ubicacion || "SIN UBICACIÓN"}
                            </p>
                          </div>

                          <div className="text-right">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                esHerramientaRegistro
                                  ? "bg-[#264f63] text-white"
                                  : "bg-[#eef2f4] text-[#264f63]"
                              }`}
                            >
                              {esHerramientaRegistro ? "Préstamo" : "Salida"}
                            </span>

                            <p className="mt-2 text-xs text-[#5f6b73]">
                              Pendiente:{" "}
                              <span className="font-semibold text-[#111111]">
                                {registro.cantidad_pendiente}
                              </span>
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {registroSeleccionado && (
          <div className="rounded-3xl bg-white p-5 shadow-md">
            <p className="text-sm font-semibold text-[#264f63]">
              {formatearFolioSalida(registroSeleccionado.folio)}
            </p>

            <h2 className="mt-1 text-2xl font-bold text-[#111111]">
              {registroSeleccionado.nombre}
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-[#5f6b73]">
              {registroSeleccionado.descripcion || ""}
            </p>

            <p className="mt-2 inline-flex rounded-full bg-[#e7ecef] px-3 py-1 text-xs font-semibold text-[#264f63]">
              {registroSeleccionado.ubicacion || "SIN UBICACIÓN"}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f7f8fa] p-4">
                <p className="text-xs uppercase tracking-wide text-[#5f6b73]">
                  Código
                </p>
                <p className="mt-2 text-base font-bold text-[#111111]">
                  {registroSeleccionado.codigo_barras || "SIN-CODIGO"}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f7f8fa] p-4">
                <p className="text-xs uppercase tracking-wide text-[#5f6b73]">
                  Tipo
                </p>
                <p className="mt-2 text-base font-bold text-[#111111]">
                  {registroSeleccionado.tipo || ""}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f7f8fa] p-4">
                <p className="text-xs uppercase tracking-wide text-[#5f6b73]">
                  Pendiente
                </p>
                <p className="mt-2 text-2xl font-bold text-[#264f63]">
                  {cantidadPendiente}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f7f8fa] p-4">
                <p className="text-xs uppercase tracking-wide text-[#5f6b73]">
                  Movimiento
                </p>
                <p className="mt-2 text-base font-bold text-[#111111]">
                  {esHerramienta ? "Préstamo" : "Salida"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-[#f7f8fa] p-4">
              <p className="text-sm text-[#5f6b73]">
                {esHerramienta ? "Días desde la salida" : "Devolución"}
              </p>
              <p className="mt-2 text-2xl font-bold text-[#264f63]">
                {esHerramienta ? diasAtraso : "Sobrante"}
              </p>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#111111]">
                  Cantidad a devolver
                </label>
                <input
                  type="number"
                  min="1"
                  value={cantidadDevolver}
                  onChange={(e) => setCantidadDevolver(e.target.value)}
                  placeholder="Cantidad"
                  disabled={guardando}
                  className="min-h-[56px] w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 text-base text-[#111111] outline-none disabled:bg-[#f7f8fa] disabled:opacity-70"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#111111]">
                  Observaciones
                </label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Observaciones"
                  disabled={guardando}
                  className="min-h-[56px] w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 text-base text-[#111111] outline-none disabled:bg-[#f7f8fa] disabled:opacity-70"
                />
              </div>

              <div className="rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 text-sm font-semibold text-[#264f63]">
                Folio devolución:{" "}
                {folioDevolucion !== null
                  ? formatearFolioDevolucion(folioDevolucion)
                  : "-"}
              </div>

              <button
                onClick={handleRegistrarDevolucion}
                disabled={guardando}
                className="min-h-[56px] w-full rounded-2xl bg-[#264f63] px-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando ? "Registrando..." : "Registrar devolución"}
              </button>
            </div>
          </div>
        )}

        <div className="pb-2">
          <Link
            href="/hh"
            className="block w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 py-4 text-center text-base font-semibold text-[#264f63] shadow-sm"
          >
            Menú HH
          </Link>
        </div>
      </div>
    </div>
  );
}

