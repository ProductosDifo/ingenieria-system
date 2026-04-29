"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type Articulo = {
  id: number;
  codigo_barras: string | null;
  nombre: string;
  descripcion: string | null;
  tipo: string | null;
  ubicacion: string | null;
  existencia: number | null;
  costo_unitario: number | null;
};

type LineaSalida = {
  articuloId: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  ubicacion: string;
  cantidadActual: number;
  costoUnitario: number;
  cantidadSalida: number;
  cantidadNueva: number;
  valorSalida: number;
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
}

export default function RegistrarSalidaPage() {
  const [fecha, setFecha] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [ticket, setTicket] = useState("");
  const [area, setArea] = useState("");

  const [mostrarSolicitantes, setMostrarSolicitantes] = useState(false);
  const [mostrarAreas, setMostrarAreas] = useState(false);
  const [mostrarArticulos, setMostrarArticulos] = useState(false);

  const solicitanteBlurTimeout = useRef<NodeJS.Timeout | null>(null);
  const areaBlurTimeout = useRef<NodeJS.Timeout | null>(null);
  const articuloBlurTimeout = useRef<NodeJS.Timeout | null>(null);

  const [busquedaArticulo, setBusquedaArticulo] = useState("");
  const [articuloSeleccionado, setArticuloSeleccionado] =
    useState<Articulo | null>(null);
  const [cantidadSalida, setCantidadSalida] = useState("");
  const [lineas, setLineas] = useState<LineaSalida[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [folioGenerado, setFolioGenerado] = useState<number | null>(null);

  useEffect(() => {
    setFecha(new Date().toLocaleString("es-MX"));
  }, []);

  useEffect(() => {
    async function cargarArticulos() {
      const { data, error } = await supabase
        .from("articulos")
        .select(
          "id, codigo_barras, nombre, descripcion, tipo, ubicacion, existencia, costo_unitario"
        )
        .gt("existencia", 0)
        .order("nombre", { ascending: true });

      if (error) {
        console.error("Error cargando artículos:", error);
        return;
      }

      setArticulos(data || []);
    }

    cargarArticulos();
  }, []);

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
    const query = busquedaArticulo.trim().toLowerCase();
    if (!query) return articulosDisponibles;

    return articulosDisponibles.filter((articulo) => {
      return (
        (articulo.codigo_barras || "").toLowerCase().includes(query) ||
        articulo.nombre.toLowerCase().includes(query) ||
        (articulo.descripcion || "").toLowerCase().includes(query) ||
        (articulo.tipo || "").toLowerCase().includes(query) ||
        (articulo.ubicacion || "").toLowerCase().includes(query)
      );
    });
  }, [busquedaArticulo, articulosDisponibles]);

  const limpiarCapturaArticulo = () => {
    setBusquedaArticulo("");
    setArticuloSeleccionado(null);
    setCantidadSalida("");
    setMostrarArticulos(false);
  };

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
    setMostrarArticulos(false);
  };

  const handleAgregarLinea = () => {
    if (!solicitante.trim()) {
      alert("Debes seleccionar o escribir un solicitante.");
      return;
    }

    if (!area.trim()) {
      alert("Debes capturar el área.");
      return;
    }

    if (!articuloSeleccionado) {
      alert("Debes seleccionar un artículo válido.");
      return;
    }

    const cantidad = Number(cantidadSalida);
    const cantidadActual = Number(articuloSeleccionado.existencia ?? 0);
    const costoUnitario = Number(articuloSeleccionado.costo_unitario ?? 0);

    if (!cantidadSalida || Number.isNaN(cantidad) || cantidad <= 0) {
      alert("La cantidad a salir debe ser mayor que 0.");
      return;
    }

    if (cantidad > cantidadActual) {
      alert("La cantidad a retirar no puede ser mayor que la cantidad actual.");
      return;
    }

    if (Number.isNaN(costoUnitario)) {
      alert("El artículo seleccionado no tiene un costo unitario válido.");
      return;
    }

    const valorSalida = costoUnitario * cantidad;

    const nuevaLinea: LineaSalida = {
      articuloId: articuloSeleccionado.id,
      codigo: articuloSeleccionado.codigo_barras || "",
      nombre: articuloSeleccionado.nombre,
      descripcion: articuloSeleccionado.descripcion || "",
      tipo: articuloSeleccionado.tipo || "",
      ubicacion: articuloSeleccionado.ubicacion || "",
      cantidadActual,
      costoUnitario,
      cantidadSalida: cantidad,
      cantidadNueva: cantidadActual - cantidad,
      valorSalida,
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
        "id, codigo_barras, nombre, descripcion, tipo, ubicacion, existencia, costo_unitario"
      )
      .gt("existencia", 0)
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error recargando artículos:", error);
      return;
    }

    setArticulos(data || []);
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
      alert("Debes agregar al menos un artículo a la salida.");
      return;
    }

    try {
      setGuardando(true);
      setFolioGenerado(null);

      const { data, error } = await supabase.rpc("registrar_salida", {
        p_solicitante: solicitante.trim(),
        p_ticket: ticket.trim() || null,
        p_area: area.trim(),
        p_lineas: lineas.map((linea) => ({
          articuloId: linea.articuloId,
          cantidadSalida: linea.cantidadSalida,
        })),
      });

      if (error) {
        console.error("Error registrando salida:", error);
        alert(error.message || "No se pudo registrar la salida.");
        return;
      }

      const resultado = data?.[0];
      const folio = resultado?.out_folio ?? resultado?.folio ?? null;

      setFolioGenerado(folio);

      const folioFormateado =
        folio !== null ? `SAL-${String(folio).padStart(3, "0")}` : "";

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
      setFecha(new Date().toLocaleString("es-MX"));

      await recargarArticulos();
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
              Registrar salida
            </h1>
            <p className="mt-1 text-sm text-[#5f6b73]">
              Captura una salida de inventario por múltiples líneas de artículo.
            </p>
          </header>

          <section className="space-y-6 p-8">
            <div className="rounded-3xl bg-white p-6 shadow-md">
              <h2 className="mb-4 text-xl font-bold text-[#111111]">
                Datos generales
              </h2>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#111111]">
                    Fecha
                  </label>
                  <input
                    type="text"
                    value={fecha}
                    readOnly
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 text-[#111111] outline-none"
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
                    placeholder="Selecciona o escribe un solicitante"
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 py-3 text-[#111111] outline-none"
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
                            className="w-full border-b border-[#eef2f4] px-4 py-3 text-left text-sm text-[#111111] transition hover:bg-[#f7f8fa]"
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
                    placeholder="Número de ticket opcional"
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 py-3 text-[#111111] outline-none"
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
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 py-3 text-[#111111] outline-none"
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
                            className="w-full border-b border-[#eef2f4] px-4 py-3 text-left text-sm text-[#111111] transition hover:bg-[#f7f8fa]"
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
                    Folio generado
                  </label>
                  <input
                    type="text"
                    value={
                      folioGenerado !== null
                        ? `SAL-${String(folioGenerado).padStart(3, "0")}`
                        : ""
                    }
                    readOnly
                    placeholder="Se genera al registrar"
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 text-[#111111] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-md">
              <h2 className="mb-4 text-xl font-bold text-[#111111]">
                Captura de artículo
              </h2>

              <div className="relative mb-6">
                <label className="mb-2 block text-sm font-semibold text-[#111111]">
                  Buscar artículo
                </label>

                <input
                  type="text"
                  value={busquedaArticulo}
                  onChange={(e) => {
                    setBusquedaArticulo(e.target.value);
                    setMostrarArticulos(true);

                    if (articuloSeleccionado) {
                      setArticuloSeleccionado(null);
                    }
                  }}
                  onFocus={() => {
                    if (articuloBlurTimeout.current) {
                      clearTimeout(articuloBlurTimeout.current);
                    }

                    setMostrarArticulos(true);
                  }}
                  onBlur={() => {
                    articuloBlurTimeout.current = setTimeout(() => {
                      setMostrarArticulos(false);
                    }, 150);
                  }}
                  placeholder="Escribe código, nombre o ubicación"
                  className="w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 py-3 outline-none"
                />

                {mostrarArticulos && (
                  <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-[#d7dde1] bg-white shadow-xl">
                    {articulosFiltrados.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-[#5f6b73]">
                        No se encontraron artículos.
                      </div>
                    ) : (
                      articulosFiltrados.map((articulo) => (
                        <button
                          key={articulo.id}
                          type="button"
                          onMouseDown={() => seleccionarArticulo(articulo)}
                          className="w-full border-b border-[#eef2f4] px-4 py-3 text-left transition hover:bg-[#f7f8fa]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-[#264f63]">
                                {articulo.codigo_barras || "SIN-CODIGO"} ·{" "}
                                {articulo.nombre}
                              </p>

                              <p className="text-sm text-[#111111]">
                                {articulo.descripcion || "-"}
                              </p>

                              <p className="mt-1 text-xs text-[#5f6b73]">
                                Tipo: {articulo.tipo || "-"}
                              </p>

                              <p className="mt-2 inline-flex rounded-full bg-[#e7ecef] px-3 py-1 text-xs font-semibold text-[#264f63]">
                                {articulo.ubicacion || "SIN UBICACIÓN"}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-[#5f6b73]">
                                Existencia
                              </p>
                              <p className="text-sm font-semibold text-[#111111]">
                                {articulo.existencia || 0}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#111111]">
                    Nombre artículo
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={articuloSeleccionado?.nombre ?? ""}
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#111111]">
                    Descripción
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={articuloSeleccionado?.descripcion ?? ""}
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#111111]">
                    Tipo
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={articuloSeleccionado?.tipo ?? ""}
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#111111]">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={articuloSeleccionado?.ubicacion ?? ""}
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#111111]">
                    Cantidad actual
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={articuloSeleccionado?.existencia ?? ""}
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-[#f7f8fa] px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#111111]">
                    Cantidad a retirar
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cantidadSalida}
                    onChange={(e) => setCantidadSalida(e.target.value)}
                    placeholder="Cantidad"
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 py-3 outline-none"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleAgregarLinea}
                  className="rounded-2xl bg-[#264f63] px-6 py-3 font-semibold text-white transition hover:bg-[#2f5b72]"
                >
                  Agregar
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#111111]">
                  Detalle de salida
                </h2>

                <button
                  onClick={handleRegistrarSalida}
                  disabled={guardando}
                  className="rounded-2xl bg-[#264f63] px-6 py-3 font-semibold text-white transition hover:bg-[#2f5b72] disabled:opacity-50"
                >
                  {guardando ? "Registrando..." : "Registrar salida"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-sm text-[#5f6b73]">
                      <th className="px-4 py-2">Código</th>
                      <th className="px-4 py-2">Nombre</th>
                      <th className="px-4 py-2">Descripción</th>
                      <th className="px-4 py-2">Tipo</th>
                      <th className="px-4 py-2">Ubicación</th>
                      <th className="px-4 py-2">Cantidad actual</th>
                      <th className="px-4 py-2">Costo unitario</th>
                      <th className="px-4 py-2">Cantidad a retirar</th>
                      <th className="px-4 py-2">Cantidad nueva</th>
                      <th className="px-4 py-2">Acción</th>
                      <th className="px-4 py-2">Valor de salida</th>
                    </tr>
                  </thead>

                  <tbody>
                    {lineas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="rounded-2xl bg-[#f7f8fa] px-4 py-6 text-center text-sm text-[#5f6b73]"
                        >
                          No hay artículos agregados a la salida.
                        </td>
                      </tr>
                    ) : (
                      lineas.map((linea) => (
                        <tr key={linea.articuloId} className="bg-[#f7f8fa]">
                          <td className="rounded-l-2xl px-4 py-4 text-sm font-semibold text-[#264f63]">
                            {linea.codigo}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {linea.nombre}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {linea.descripcion}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {linea.tipo}
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-[#264f63]">
                            {linea.ubicacion || "SIN UBICACIÓN"}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {linea.cantidadActual}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {Number.isFinite(linea.costoUnitario)
                              ? formatCurrency(linea.costoUnitario)
                              : "-"}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {linea.cantidadSalida}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {linea.cantidadNueva}
                          </td>

                          <td className="px-4 py-4">
                            <button
                              onClick={() =>
                                handleEliminarLinea(linea.articuloId)
                              }
                              className="rounded-xl border border-[#cfd4d8] px-3 py-2 text-sm font-semibold text-[#264f63] transition hover:bg-[#eef2f4]"
                            >
                              Eliminar
                            </button>
                          </td>

                          <td className="rounded-r-2xl px-4 py-4 text-sm font-semibold text-[#111111]">
                            {Number.isFinite(linea.valorSalida)
                              ? formatCurrency(linea.valorSalida)
                              : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
