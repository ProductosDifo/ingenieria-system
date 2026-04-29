"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type TipoArticulo =
  | "Herramienta"
  | "Consumible"
  | "Refacciones"
  | "Materiales"
  | "Usado"
  | string;

type Articulo = {
  id: number;
  codigo_barras: string | null;
  nombre: string;
  descripcion: string | null;
  tipo: TipoArticulo | null;
  ubicacion: string | null;
  existencia: number;
};

type LineaSalida = {
  articuloId: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  ubicacion: string;
  cantidadActual: number;
  cantidadSalida: number;
  cantidadNueva: number;
};

const solicitantesMock = ["Alexis", "David Segura", "Roberto", "Jhonny"];

const areasMock = [
  "Barra gobierno",
  "Mix",
  "Bebidas",
  "Almacenes",
  "Planta",
  "Calidad",
  "Taller",
  "Florida",
  "Marcas propias",
  "Carros golf",
];

export default function HHSalidaPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const solicitanteBlurTimeout = useRef<NodeJS.Timeout | null>(null);
  const areaBlurTimeout = useRef<NodeJS.Timeout | null>(null);
  const articuloBlurTimeout = useRef<NodeJS.Timeout | null>(null);

  const [fecha] = useState(() => {
    const now = new Date();
    return now.toLocaleString("es-MX");
  });

  const [solicitante, setSolicitante] = useState("");
  const [ticket, setTicket] = useState("");
  const [area, setArea] = useState("");

  const [mostrarSolicitantes, setMostrarSolicitantes] = useState(false);
  const [mostrarAreas, setMostrarAreas] = useState(false);
  const [mostrarArticulos, setMostrarArticulos] = useState(false);

  const [busquedaArticulo, setBusquedaArticulo] = useState("");
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [cargandoArticulos, setCargandoArticulos] = useState(false);

  const [articuloSeleccionado, setArticuloSeleccionado] =
    useState<Articulo | null>(null);
  const [cantidadSalida, setCantidadSalida] = useState("");
  const [lineas, setLineas] = useState<LineaSalida[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [folioSalida, setFolioSalida] = useState<number | null>(null);

  const formatearFolioSalida = (folio: number | null | undefined) => {
    if (folio === null || folio === undefined) return "";
    return `SAL-${String(folio).padStart(3, "0")}`;
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (articuloSeleccionado) return;

    const timer = setTimeout(async () => {
      try {
        setCargandoArticulos(true);

        let query = supabase
          .from("articulos")
          .select(
            "id, codigo_barras, nombre, descripcion, tipo, ubicacion, existencia"
          )
          .gt("existencia", 0)
          .order("nombre", { ascending: true })
          .limit(30);

        const texto = busquedaArticulo.trim();

        if (texto) {
          query = query.or(
            `codigo_barras.ilike.%${texto}%,nombre.ilike.%${texto}%,descripcion.ilike.%${texto}%,tipo.ilike.%${texto}%,ubicacion.ilike.%${texto}%`
          );
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error cargando artículos HH:", error);
          setArticulos([]);
          return;
        }

        setArticulos((data || []) as Articulo[]);
      } finally {
        setCargandoArticulos(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [busquedaArticulo, articuloSeleccionado]);

  const articulosDisponibles = useMemo(() => {
    return articulos.filter((articulo) => {
      const yaAgregado = lineas.some((l) => l.articuloId === articulo.id);
      return !yaAgregado;
    });
  }, [articulos, lineas]);

  const solicitantesFiltrados = useMemo(() => {
    const query = solicitante.trim().toLowerCase();
    if (!query) return solicitantesMock;
    return solicitantesMock.filter((item) =>
      item.toLowerCase().includes(query)
    );
  }, [solicitante]);

  const areasFiltradas = useMemo(() => {
    const query = area.trim().toLowerCase();
    if (!query) return areasMock;
    return areasMock.filter((item) => item.toLowerCase().includes(query));
  }, [area]);

  const articulosFiltrados = useMemo(() => {
    return articulosDisponibles;
  }, [articulosDisponibles]);

  const seleccionarSolicitante = (valor: string) => {
    setSolicitante(valor);
    setMostrarSolicitantes(false);
  };

  const seleccionarArea = (valor: string) => {
    setArea(valor);
    setMostrarAreas(false);
  };

  const seleccionarArticulo = (articulo: Articulo) => {
    setArticuloSeleccionado(articulo);
    setBusquedaArticulo(
      `${articulo.codigo_barras || "SIN-CODIGO"} - ${articulo.nombre}`
    );
    setArticulos([articulo]);
    setMostrarArticulos(false);
  };

  const buscarPrimerArticulo = async () => {
    const texto = busquedaArticulo.trim();

    if (!texto) return;

    try {
      setCargandoArticulos(true);

      const codigoLimpio = texto.split(" - ")[0].trim();

      const { data, error } = await supabase
        .from("articulos")
        .select(
          "id, codigo_barras, nombre, descripcion, tipo, ubicacion, existencia"
        )
        .eq("codigo_barras", codigoLimpio)
        .gt("existencia", 0)
        .order("ubicacion", { ascending: true });

      if (error) {
        console.error("Error buscando artículo exacto HH:", error);
        alert("Error buscando el artículo.");
        return;
      }

      if (data && data.length > 0) {
        const articulosEncontrados = data as Articulo[];

        if (articulosEncontrados.length === 1) {
          seleccionarArticulo(articulosEncontrados[0]);
          return;
        }

        setArticuloSeleccionado(null);
        setArticulos(articulosEncontrados);
        setMostrarArticulos(true);
        return;
      }

      const encontrado = articulosFiltrados[0];

      if (encontrado) {
        seleccionarArticulo(encontrado);
      } else {
        setArticuloSeleccionado(null);
        alert("No se encontró ningún artículo con ese código.");
      }
    } finally {
      setCargandoArticulos(false);
    }
  };

  const limpiarCapturaArticulo = () => {
    setBusquedaArticulo("");
    setArticuloSeleccionado(null);
    setCantidadSalida("");
    setArticulos([]);
    setMostrarArticulos(false);
    inputRef.current?.focus();
  };

  const handleAgregarLinea = () => {
    if (!solicitante.trim()) {
      alert("Debes seleccionar o escribir un solicitante.");
      return;
    }

    if (!area.trim()) {
      alert("Debes seleccionar un área.");
      return;
    }

    if (!articuloSeleccionado) {
      alert("Debes seleccionar un artículo válido.");
      return;
    }

    const cantidad = Number(cantidadSalida);

    if (!cantidadSalida || Number.isNaN(cantidad) || cantidad <= 0) {
      alert("La cantidad a salir debe ser mayor que 0.");
      return;
    }

    if (cantidad > articuloSeleccionado.existencia) {
      alert("La cantidad a retirar no puede ser mayor que la existencia.");
      return;
    }

    const nuevaLinea: LineaSalida = {
      articuloId: articuloSeleccionado.id,
      codigo: articuloSeleccionado.codigo_barras || "",
      nombre: articuloSeleccionado.nombre,
      descripcion: articuloSeleccionado.descripcion || "",
      tipo: articuloSeleccionado.tipo || "",
      ubicacion: articuloSeleccionado.ubicacion || "",
      cantidadActual: articuloSeleccionado.existencia,
      cantidadSalida: cantidad,
      cantidadNueva: articuloSeleccionado.existencia - cantidad,
    };

    setLineas((prev) => [...prev, nuevaLinea]);
    limpiarCapturaArticulo();
  };

  const handleEliminarLinea = (articuloId: number) => {
    setLineas((prev) => prev.filter((linea) => linea.articuloId !== articuloId));
  };

  const recargarArticulos = async () => {
    const { data, error } = await supabase
      .from("articulos")
      .select(
        "id, codigo_barras, nombre, descripcion, tipo, ubicacion, existencia"
      )
      .gt("existencia", 0)
      .order("nombre", { ascending: true })
      .limit(30);

    if (error) {
      console.error("Error recargando artículos HH:", error);
      return;
    }

    setArticulos((data || []) as Articulo[]);
  };

  const handleRegistrarSalida = async () => {
    if (!solicitante.trim()) {
      alert("Debes capturar el solicitante.");
      return;
    }

    if (!area.trim()) {
      alert("Debes capturar el área.");
      return;
    }

    if (lineas.length === 0) {
      alert("Debes agregar al menos un artículo.");
      return;
    }

    try {
      setGuardando(true);

      const payloadLineas = lineas.map((linea) => ({
        articuloId: linea.articuloId,
        cantidadSalida: linea.cantidadSalida,
      }));

      const { data, error } = await supabase.rpc("registrar_salida", {
        p_solicitante: solicitante.trim(),
        p_ticket: ticket.trim() || null,
        p_area: area.trim(),
        p_lineas: payloadLineas,
      });

      if (error) {
        console.error("Error registrando salida HH:", error);
        alert(error.message || "No se pudo registrar la salida.");
        return;
      }

      const resultado = data?.[0];
      const folio = resultado?.out_folio ?? resultado?.folio ?? null;
      setFolioSalida(folio);

      const folioFormateado = formatearFolioSalida(folio);

      alert(
        folioFormateado
          ? `Salida registrada correctamente. Folio: ${folioFormateado}`
          : "Salida registrada correctamente."
      );

      setSolicitante("");
      setTicket("");
      setArea("");
      setLineas([]);
      limpiarCapturaArticulo();
      await recargarArticulos();
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
          <h1 className="mt-2 text-3xl font-bold">Registrar salida</h1>
          <p className="mt-2 text-sm text-white/80">
            Escanea el artículo, captura cantidad y registra la salida.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-md">
          <p className="mb-3 text-sm font-semibold text-[#111111]">
            Datos generales
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#111111]">
                Fecha
              </label>
              <input
                type="text"
                readOnly
                value={fecha}
                className="min-h-[56px] w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 text-base text-[#111111] outline-none"
              />
            </div>

            <div className="relative">
              <label className="mb-2 block text-sm font-semibold text-[#111111]">
                Solicitante
              </label>
              <input
                type="text"
                value={solicitante}
                onChange={(e) => {
                  setSolicitante(e.target.value);
                  setMostrarSolicitantes(true);
                }}
                onFocus={() => {
                  if (solicitanteBlurTimeout.current) {
                    clearTimeout(solicitanteBlurTimeout.current);
                  }
                  setMostrarSolicitantes(true);
                }}
                onBlur={() => {
                  solicitanteBlurTimeout.current = setTimeout(() => {
                    setMostrarSolicitantes(false);
                  }, 150);
                }}
                placeholder="Selecciona o escribe"
                className="min-h-[56px] w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 text-base text-[#111111] outline-none"
              />

              {mostrarSolicitantes && (
                <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-[#d7dde1] bg-white shadow-xl">
                  {solicitantesFiltrados.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-[#5f6b73]">
                      No se encontraron solicitantes.
                    </div>
                  ) : (
                    solicitantesFiltrados.map((item, index) => (
                      <button
                        key={`${item}-${index}`}
                        type="button"
                        onMouseDown={() => seleccionarSolicitante(item)}
                        className="w-full border-b border-[#eef2f4] px-4 py-4 text-left text-base text-[#111111] transition hover:bg-[#f7f8fa]"
                      >
                        {item}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#111111]">
                Ticket
              </label>
              <input
                type="text"
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
                placeholder="Opcional"
                className="min-h-[56px] w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 text-base text-[#111111] outline-none"
              />
            </div>

            <div className="relative">
              <label className="mb-2 block text-sm font-semibold text-[#111111]">
                Área
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setMostrarAreas(true);
                }}
                onFocus={() => {
                  if (areaBlurTimeout.current) {
                    clearTimeout(areaBlurTimeout.current);
                  }
                  setMostrarAreas(true);
                }}
                onBlur={() => {
                  areaBlurTimeout.current = setTimeout(() => {
                    setMostrarAreas(false);
                  }, 150);
                }}
                placeholder="Selecciona un área"
                className="min-h-[56px] w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 text-base text-[#111111] outline-none"
              />

              {mostrarAreas && (
                <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-[#d7dde1] bg-white shadow-xl">
                  {areasFiltradas.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-[#5f6b73]">
                      No se encontraron áreas.
                    </div>
                  ) : (
                    areasFiltradas.map((item, index) => (
                      <button
                        key={`${item}-${index}`}
                        type="button"
                        onMouseDown={() => seleccionarArea(item)}
                        className="w-full border-b border-[#eef2f4] px-4 py-4 text-left text-base text-[#111111] transition hover:bg-[#f7f8fa]"
                      >
                        {item}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 text-sm font-semibold text-[#264f63]">
              Folio salida:{" "}
              {folioSalida !== null ? formatearFolioSalida(folioSalida) : "-"}
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-md">
          <p className="mb-3 text-sm font-semibold text-[#111111]">
            Escanear artículo
          </p>

          <div className="relative space-y-3">
            <input
              ref={inputRef}
              type="text"
              value={busquedaArticulo}
              onChange={(e) => {
                setBusquedaArticulo(e.target.value);
                setMostrarArticulos(true);

                if (articuloSeleccionado) {
                  setArticuloSeleccionado(null);
                  setArticulos([]);
                }
              }}
              onFocus={() => {
                if (articuloBlurTimeout.current) {
                  clearTimeout(articuloBlurTimeout.current);
                }

                if (!articuloSeleccionado) {
                  setMostrarArticulos(true);
                }
              }}
              onBlur={() => {
                articuloBlurTimeout.current = setTimeout(() => {
                  setMostrarArticulos(false);
                }, 150);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  buscarPrimerArticulo();
                }
              }}
              placeholder="Escanea o escribe código"
              className="min-h-[58px] w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 text-base text-[#111111] outline-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={buscarPrimerArticulo}
                className="min-h-[52px] rounded-2xl bg-[#264f63] px-4 text-base font-semibold text-white"
              >
                Buscar
              </button>

              <button
                onClick={limpiarCapturaArticulo}
                className="min-h-[52px] rounded-2xl border border-[#cfd4d8] bg-white px-4 text-base font-semibold text-[#264f63]"
              >
                Limpiar
              </button>
            </div>

            {mostrarArticulos && !articuloSeleccionado && (
              <div className="absolute left-0 right-0 top-[118px] z-20 max-h-80 overflow-y-auto rounded-2xl border border-[#d7dde1] bg-white shadow-xl">
                {cargandoArticulos ? (
                  <div className="px-4 py-4 text-sm text-[#5f6b73]">
                    Cargando artículos...
                  </div>
                ) : articulosFiltrados.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-[#5f6b73]">
                    No se encontraron artículos.
                  </div>
                ) : (
                  articulosFiltrados.map((articulo) => (
                    <button
                      key={articulo.id}
                      type="button"
                      onMouseDown={() => seleccionarArticulo(articulo)}
                      className="w-full border-b border-[#eef2f4] px-4 py-4 text-left transition hover:bg-[#f7f8fa]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#264f63]">
                            {articulo.codigo_barras || "SIN-CODIGO"}
                          </p>

                          <p className="mt-1 text-base font-semibold text-[#111111]">
                            {articulo.nombre}
                          </p>

                          <p className="mt-1 text-sm text-[#5f6b73]">
                            {articulo.descripcion}
                          </p>

                          <p className="mt-2 inline-flex rounded-full bg-[#e7ecef] px-3 py-1 text-xs font-semibold text-[#264f63]">
                            {articulo.ubicacion || "SIN UBICACIÓN"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-[#5f6b73]">Existencia</p>
                          <p className="text-sm font-semibold text-[#111111]">
                            {articulo.existencia}
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

        {articuloSeleccionado && (
          <div className="rounded-3xl bg-white p-5 shadow-md">
            <p className="text-sm font-semibold text-[#264f63]">
              {articuloSeleccionado.codigo_barras || ""}
            </p>

            <h2 className="mt-1 text-2xl font-bold text-[#111111]">
              {articuloSeleccionado.nombre}
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-[#5f6b73]">
              {articuloSeleccionado.descripcion}
            </p>

            <p className="mt-2 inline-flex rounded-full bg-[#e7ecef] px-3 py-1 text-xs font-semibold text-[#264f63]">
              {articuloSeleccionado.ubicacion || "SIN UBICACIÓN"}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f7f8fa] p-4">
                <p className="text-xs uppercase tracking-wide text-[#5f6b73]">
                  Tipo
                </p>
                <p className="mt-2 text-base font-bold text-[#111111]">
                  {articuloSeleccionado.tipo || ""}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f7f8fa] p-4">
                <p className="text-xs uppercase tracking-wide text-[#5f6b73]">
                  Existencia
                </p>
                <p className="mt-2 text-2xl font-bold text-[#264f63]">
                  {articuloSeleccionado.existencia}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-[#111111]">
                Cantidad a retirar
              </label>
              <input
                type="number"
                min="1"
                value={cantidadSalida}
                onChange={(e) => setCantidadSalida(e.target.value)}
                placeholder="Cantidad"
                className="min-h-[56px] w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 text-base text-[#111111] outline-none"
              />
            </div>

            <div className="mt-4">
              <button
                onClick={handleAgregarLinea}
                className="min-h-[54px] w-full rounded-2xl bg-[#264f63] px-4 text-base font-semibold text-white"
              >
                Agregar a salida
              </button>
            </div>
          </div>
        )}

        <div className="rounded-3xl bg-white p-5 shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#111111]">
              Resumen de salida
            </p>
            <span className="rounded-full bg-[#eef2f4] px-3 py-1 text-sm font-semibold text-[#264f63]">
              {lineas.length}
            </span>
          </div>

          <div className="space-y-3">
            {lineas.length === 0 ? (
              <div className="rounded-2xl bg-[#f7f8fa] px-4 py-4 text-sm text-[#5f6b73]">
                No hay artículos agregados.
              </div>
            ) : (
              lineas.map((linea) => (
                <div
                  key={linea.articuloId}
                  className="rounded-2xl border border-[#e4e8eb] bg-[#f7f8fa] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#264f63]">
                        {linea.codigo}
                      </p>

                      <p className="mt-1 text-base font-semibold text-[#111111]">
                        {linea.nombre}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[#264f63]">
                        {linea.ubicacion || "SIN UBICACIÓN"}
                      </p>

                      <p className="mt-1 text-sm text-[#5f6b73]">
                        Cantidad: {linea.cantidadSalida} · Nueva:{" "}
                        {linea.cantidadNueva}
                      </p>
                    </div>

                    <button
                      onClick={() => handleEliminarLinea(linea.articuloId)}
                      className="rounded-xl border border-[#cfd4d8] bg-white px-3 py-2 text-sm font-semibold text-[#264f63]"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={handleRegistrarSalida}
              disabled={guardando}
              className="min-h-[56px] w-full rounded-2xl bg-[#264f63] px-4 text-base font-semibold text-white disabled:opacity-50"
            >
              {guardando ? "Registrando..." : "Registrar salida"}
            </button>
          </div>
        </div>

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
