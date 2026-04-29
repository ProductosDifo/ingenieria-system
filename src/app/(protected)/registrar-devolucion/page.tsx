"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
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

export default function RegistrarDevolucionPage() {
  const [busqueda, setBusqueda] = useState("");
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [registroSeleccionado, setRegistroSeleccionado] =
    useState<Registro | null>(null);
  const [cantidadDevolver, setCantidadDevolver] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [folioDevolucion, setFolioDevolucion] = useState<number | null>(null);

  const blurTimeout = useRef<NodeJS.Timeout | null>(null);

  const formatearFolioSalida = (folio: number | null | undefined) => {
    if (folio === null || folio === undefined) return "";
    return `SAL-${String(folio).padStart(3, "0")}`;
  };

  const formatearFolioDevolucion = (folio: number | null | undefined) => {
    if (folio === null || folio === undefined) return "";
    return `DEV-${String(folio).padStart(3, "0")}`;
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc("buscar_registros_devolucion", {
        p_busqueda: busqueda.trim() || null,
      });

      if (error) {
        console.error("Error cargando registros de devolución:", error);
        setRegistros([]);
        return;
      }

      setRegistros((data || []) as Registro[]);
    }, 250);

    return () => clearTimeout(timer);
  }, [busqueda]);

  const registrosFiltrados = useMemo(() => registros, [registros]);

  const cantidadPendiente = registroSeleccionado?.cantidad_pendiente ?? 0;

  const seleccionarRegistro = (registro: Registro) => {
    setRegistroSeleccionado(registro);
    setBusqueda(
      `${formatearFolioSalida(registro.folio)} - ${
        registro.codigo_barras || ""
      } - ${registro.nombre}`
    );
    setCantidadDevolver("");
    setObservaciones("");
    setMostrarResultados(false);
    setFolioDevolucion(null);
  };

  const recargarPendientes = async () => {
    const { data, error } = await supabase.rpc("buscar_registros_devolucion", {
      p_busqueda: null,
    });

    if (error) {
      console.error("Error recargando pendientes:", error);
      return;
    }

    setRegistros((data || []) as Registro[]);
  };

  const handleRegistrarDevolucion = async () => {
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
        p_observaciones: observaciones || null,
      });

      if (error) {
        console.error("Error registrando devolución:", error);
        alert(error.message || "No se pudo registrar la devolución.");
        return;
      }

      const resultado = data?.[0];
      const folio = resultado?.out_folio ?? null;
      setFolioDevolucion(folio);

      const folioFormateado = formatearFolioDevolucion(folio);

      alert(
        folioFormateado
          ? `Devolución registrada correctamente. Folio devolución: ${folioFormateado}`
          : "Devolución registrada correctamente."
      );

      setBusqueda("");
      setRegistroSeleccionado(null);
      setCantidadDevolver("");
      setObservaciones("");
      setMostrarResultados(false);

      await recargarPendientes();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e7ecef]">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1">
          <header className="border-b border-[#d7dde1] bg-white px-8 py-5">
            <h1 className="text-2xl font-bold text-[#111111]">
              Registrar devolución
            </h1>
            <p className="mt-1 text-sm text-[#5f6b73]">
              Registra devoluciones reales de salidas.
            </p>
          </header>

          <section className="space-y-6 p-8">
            <div className="rounded-3xl bg-white p-6 shadow-md">
              <h2 className="mb-4 text-xl font-bold text-[#111111]">
                Buscar registro
              </h2>

              <div className="relative">
                <label className="mb-2 block text-sm font-semibold text-[#111111]">
                  Buscar por salida, ticket, código, artículo o solicitante
                </label>

                <input
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
                  placeholder="Ej. SAL-001, ticket, código, artículo o solicitante..."
                  className="w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 py-3 outline-none transition focus:border-[#264f63]"
                />

                {mostrarResultados && (
                  <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-[#d7dde1] bg-white shadow-xl">
                    {registrosFiltrados.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-[#5f6b73]">
                        No se encontraron resultados.
                      </div>
                    ) : (
                      registrosFiltrados.map((registro) => (
                        <button
                          key={registro.salida_detalle_id}
                          type="button"
                          onMouseDown={() => seleccionarRegistro(registro)}
                          className="w-full border-b border-[#eef2f4] px-4 py-3 text-left transition hover:bg-[#f7f8fa]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-[#264f63]">
                                {formatearFolioSalida(registro.folio)} ·{" "}
                                {registro.codigo_barras || "SIN-CODIGO"}
                              </p>

                              <p className="text-sm text-[#111111]">
                                {registro.nombre}
                              </p>

                              <p className="mt-1 text-xs text-[#5f6b73]">
                                {registro.solicitante} ·{" "}
                                {registro.ticket || "Sin ticket"} ·{" "}
                                {registro.area}
                              </p>

                              <p className="mt-2 inline-flex rounded-full bg-[#e7ecef] px-3 py-1 text-xs font-semibold text-[#264f63]">
                                {registro.ubicacion || "SIN UBICACIÓN"}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-[#5f6b73]">
                                Pendiente
                              </p>
                              <p className="text-sm font-semibold text-[#111111]">
                                {registro.cantidad_pendiente}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#111111]">
                  Detalle del registro
                </h2>

                <div className="rounded-full bg-[#eef2f4] px-4 py-2 text-sm font-semibold text-[#264f63]">
                  Salida real
                </div>
              </div>

              {!registroSeleccionado ? (
                <div className="rounded-2xl bg-[#f7f8fa] px-4 py-8 text-center text-sm text-[#5f6b73]">
                  Selecciona un registro para continuar.
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#111111]">
                        Folio
                      </label>
                      <input
                        readOnly
                        value={formatearFolioSalida(
                          registroSeleccionado.folio
                        )}
                        className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#111111]">
                        Ticket
                      </label>
                      <input
                        readOnly
                        value={registroSeleccionado.ticket || ""}
                        className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#111111]">
                        Solicitante
                      </label>
                      <input
                        readOnly
                        value={registroSeleccionado.solicitante}
                        className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#111111]">
                        Área
                      </label>
                      <input
                        readOnly
                        value={registroSeleccionado.area}
                        className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#111111]">
                        Código
                      </label>
                      <input
                        readOnly
                        value={registroSeleccionado.codigo_barras || ""}
                        className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#111111]">
                        Nombre
                      </label>
                      <input
                        readOnly
                        value={registroSeleccionado.nombre}
                        className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#111111]">
                        Tipo artículo
                      </label>
                      <input
                        readOnly
                        value={registroSeleccionado.tipo || ""}
                        className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#111111]">
                        Ubicación
                      </label>
                      <input
                        readOnly
                        value={registroSeleccionado.ubicacion || ""}
                        className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#111111]">
                        Fecha original
                      </label>
                      <input
                        readOnly
                        value={new Date(
                          registroSeleccionado.fecha
                        ).toLocaleString("es-MX")}
                        className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-[#f7f8fa] p-4">
                      <p className="text-sm text-[#5f6b73]">Cantidad salida</p>
                      <p className="mt-2 text-2xl font-bold text-[#264f63]">
                        {registroSeleccionado.cantidad_original}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#f7f8fa] p-4">
                      <p className="text-sm text-[#5f6b73]">Ya devuelto</p>
                      <p className="mt-2 text-2xl font-bold text-[#264f63]">
                        {registroSeleccionado.cantidad_devuelta}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#f7f8fa] p-4">
                      <p className="text-sm text-[#5f6b73]">Pendiente</p>
                      <p className="mt-2 text-2xl font-bold text-[#264f63]">
                        {cantidadPendiente}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#111111]">
                  Registrar devolución
                </h2>

                <div className="rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-2 text-sm font-semibold text-[#264f63]">
                  Folio devolución:{" "}
                  {folioDevolucion !== null
                    ? formatearFolioDevolucion(folioDevolucion)
                    : "-"}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 py-3 outline-none"
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
                    placeholder="Observaciones de devolución"
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 py-3 outline-none"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleRegistrarDevolucion}
                  disabled={guardando}
                  className="rounded-2xl bg-[#264f63] px-6 py-3 font-semibold text-white transition hover:bg-[#2f5b72] disabled:opacity-50"
                >
                  {guardando ? "Registrando..." : "Registrar devolución"}
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
