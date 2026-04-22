"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
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
  activo: boolean | null;
};

type TotalesInventario = {
  totalArticulos: number;
  totalExistencia: number;
  totalValor: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
}

const PAGE_SIZE = 100;
const TOTALES_BATCH_SIZE = 1000;

export default function ConsultarInventarioPage() {
  const [busqueda, setBusqueda] = useState("");
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTotales, setLoadingTotales] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [totales, setTotales] = useState<TotalesInventario>({
    totalArticulos: 0,
    totalExistencia: 0,
    totalValor: 0,
  });

  const contenedorBusquedaRef = useRef<HTMLDivElement | null>(null);
  const terminoBusqueda = busqueda.trim();

  const totalPaginas =
    totalRegistros === 0 ? 0 : Math.ceil(totalRegistros / PAGE_SIZE);

  const inicioRegistro =
    totalRegistros === 0 ? 0 : (paginaActual - 1) * PAGE_SIZE + 1;

  const finRegistro =
    totalRegistros === 0
      ? 0
      : Math.min(paginaActual * PAGE_SIZE, totalRegistros);

  const filtrosBusqueda = useMemo(() => {
    if (!terminoBusqueda) return null;

    return [
      `nombre.ilike.%${terminoBusqueda}%`,
      `codigo_barras.ilike.%${terminoBusqueda}%`,
      `descripcion.ilike.%${terminoBusqueda}%`,
      `tipo.ilike.%${terminoBusqueda}%`,
      `ubicacion.ilike.%${terminoBusqueda}%`,
    ].join(",");
  }, [terminoBusqueda]);

  useEffect(() => {
    async function cargarInventario() {
      setLoading(true);
      setErrorMsg("");

      const from = (paginaActual - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("articulos")
        .select(
          "id, codigo_barras, nombre, descripcion, tipo, ubicacion, existencia, costo_unitario, valor_fisico, activo",
          { count: "exact" }
        )
        .eq("activo", true)
        .gt("existencia", 0)
        .order("nombre", { ascending: true })
        .order("ubicacion", { ascending: true })
        .range(from, to);

      if (filtrosBusqueda) {
        query = query.or(filtrosBusqueda);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error cargando inventario:", error);
        setErrorMsg("No se pudo cargar el inventario.");
        setInventario([]);
        setTotalRegistros(0);
      } else {
        setInventario((data || []) as InventarioItem[]);
        setTotalRegistros(count || 0);
      }

      setLoading(false);
    }

    cargarInventario();
  }, [paginaActual, filtrosBusqueda]);

  useEffect(() => {
    async function cargarTotalesCompletos() {
      setLoadingTotales(true);

      try {
        let acumuladoArticulos = 0;
        let acumuladoExistencia = 0;
        let acumuladoValor = 0;
        let from = 0;
        let hayMas = true;

        while (hayMas) {
          let query = supabase
            .from("articulos")
            .select("id, existencia, valor_fisico")
            .eq("activo", true)
            .gt("existencia", 0)
            .order("id", { ascending: true })
            .range(from, from + TOTALES_BATCH_SIZE - 1);

          if (filtrosBusqueda) {
            query = query.or(filtrosBusqueda);
          }

          const { data, error } = await query;

          if (error) {
            throw error;
          }

          const filas = data || [];

          acumuladoArticulos += filas.length;
          acumuladoExistencia += filas.reduce(
            (acc, item) => acc + Number(item.existencia || 0),
            0
          );
          acumuladoValor += filas.reduce(
            (acc, item) => acc + Number(item.valor_fisico || 0),
            0
          );

          if (filas.length < TOTALES_BATCH_SIZE) {
            hayMas = false;
          } else {
            from += TOTALES_BATCH_SIZE;
          }
        }

        setTotales({
          totalArticulos: acumuladoArticulos,
          totalExistencia: acumuladoExistencia,
          totalValor: acumuladoValor,
        });
      } catch (error) {
        console.error("Error cargando totales completos:", error);
        setTotales({
          totalArticulos: 0,
          totalExistencia: 0,
          totalValor: 0,
        });
      } finally {
        setLoadingTotales(false);
      }
    }

    cargarTotalesCompletos();
  }, [filtrosBusqueda]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      const q = terminoBusqueda;

      if (!q) {
        setSugerencias([]);
        return;
      }

      const { data, error } = await supabase
        .from("articulos")
        .select("nombre")
        .eq("activo", true)
        .gt("existencia", 0)
        .ilike("nombre", `%${q}%`)
        .order("nombre", { ascending: true })
        .limit(8);

      if (error) {
        console.error("Error cargando sugerencias:", error);
        setSugerencias([]);
        return;
      }

      const nombresUnicos = Array.from(
        new Set(
          (data || [])
            .map((item) => item.nombre?.trim())
            .filter((nombre): nombre is string => Boolean(nombre))
        )
      );

      setSugerencias(nombresUnicos);
    }, 250);

    return () => clearTimeout(delay);
  }, [terminoBusqueda]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        contenedorBusquedaRef.current &&
        !contenedorBusquedaRef.current.contains(event.target as Node)
      ) {
        setMostrarSugerencias(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [terminoBusqueda]);

  const irPaginaAnterior = () => {
    setPaginaActual((prev) => Math.max(prev - 1, 1));
  };

  const irPaginaSiguiente = () => {
    setPaginaActual((prev) =>
      totalPaginas === 0 ? 0 : Math.min(prev + 1, totalPaginas)
    );
  };

  return (
    <div className="min-h-screen bg-[#e7ecef]">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1">
          <header className="border-b border-[#d7dde1] bg-white px-8 py-5">
            <h1 className="text-2xl font-bold text-[#111111]">
              Consultar inventario
            </h1>
            <p className="mt-1 text-sm text-[#5f6b73]">
              Consulta existencias, costo unitario y valor físico en almacén.
            </p>
          </header>

          <section className="space-y-6 p-8">
            <div className="rounded-3xl bg-white p-6 shadow-md">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div
                  className="relative xl:col-span-2"
                  ref={contenedorBusquedaRef}
                >
                  <label className="mb-2 block text-sm font-semibold text-[#111111]">
                    Buscar artículo
                  </label>

                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setMostrarSugerencias(true);
                    }}
                    onFocus={() => setMostrarSugerencias(true)}
                    placeholder="Buscar por código, nombre, descripción, tipo o ubicación"
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 py-3 outline-none"
                  />

                  {mostrarSugerencias && sugerencias.length > 0 && (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-[#d7dde1] bg-white shadow-lg">
                      {sugerencias.map((nombre) => (
                        <button
                          key={nombre}
                          type="button"
                          onClick={() => {
                            setBusqueda(nombre);
                            setMostrarSugerencias(false);
                          }}
                          className="block w-full border-b border-[#eef1f3] px-4 py-3 text-left text-sm text-[#111111] hover:bg-[#f7f8fa]"
                        >
                          {nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">
                    {terminoBusqueda
                      ? "Artículos filtrados"
                      : "Total de artículos"}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {loadingTotales ? "..." : totales.totalArticulos}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">
                    {terminoBusqueda
                      ? "Existencia filtrada"
                      : "Existencia total"}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {loadingTotales ? "..." : totales.totalExistencia}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-[#f7f8fa] p-4">
                <p className="text-sm text-[#5f6b73]">
                  {terminoBusqueda
                    ? "Valor total del resultado filtrado"
                    : "Valor total físico del inventario"}
                </p>
                <p className="mt-2 text-3xl font-bold text-[#264f63]">
                  {loadingTotales ? "..." : formatCurrency(totales.totalValor)}
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-md">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#111111]">
                    Inventario disponible
                  </h2>
                  <p className="mt-1 text-sm text-[#5f6b73]">
                    Vista general por artículo y ubicación con existencia y valor físico.
                  </p>
                </div>

                {!loading && !errorMsg && (
                  <p className="text-sm text-[#5f6b73]">
                    Mostrando {inicioRegistro}-{finRegistro} de {totalRegistros} resultados
                  </p>
                )}
              </div>

              {loading ? (
                <div className="rounded-2xl bg-[#f7f8fa] px-4 py-6 text-sm text-[#5f6b73]">
                  Cargando inventario...
                </div>
              ) : errorMsg ? (
                <div className="rounded-2xl bg-red-50 px-4 py-6 text-sm text-red-600">
                  {errorMsg}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-3">
                      <thead>
                        <tr className="text-left text-sm text-[#5f6b73]">
                          <th className="px-4 py-2">Código</th>
                          <th className="px-4 py-2">Nombre</th>
                          <th className="px-4 py-2">Descripción</th>
                          <th className="px-4 py-2">Tipo</th>
                          <th className="px-4 py-2">Ubicación</th>
                          <th className="px-4 py-2">Existencia</th>
                          <th className="px-4 py-2">Costo unitario</th>
                          <th className="px-4 py-2">Valor físico</th>
                        </tr>
                      </thead>

                      <tbody>
                        {inventario.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="rounded-2xl bg-[#f7f8fa] px-4 py-6 text-center text-sm text-[#5f6b73]"
                            >
                              No se encontraron artículos con esa búsqueda.
                            </td>
                          </tr>
                        ) : (
                          inventario.map((item) => (
                            <tr key={item.id} className="bg-[#f7f8fa]">
                              <td className="rounded-l-2xl px-4 py-4 text-sm font-semibold text-[#264f63]">
                                {item.codigo_barras || "-"}
                              </td>
                              <td className="px-4 py-4 text-sm text-[#111111]">
                                {item.nombre}
                              </td>
                              <td className="px-4 py-4 text-sm text-[#111111]">
                                {item.descripcion || "-"}
                              </td>
                              <td className="px-4 py-4 text-sm text-[#111111]">
                                {item.tipo || "-"}
                              </td>
                              <td className="px-4 py-4 text-sm text-[#111111]">
                                {item.ubicacion || "-"}
                              </td>
                              <td className="px-4 py-4 text-sm text-[#111111]">
                                {item.existencia ?? 0}
                              </td>
                              <td className="px-4 py-4 text-sm text-[#111111]">
                                {formatCurrency(Number(item.costo_unitario || 0))}
                              </td>
                              <td className="rounded-r-2xl px-4 py-4 text-sm font-semibold text-[#264f63]">
                                {formatCurrency(Number(item.valor_fisico || 0))}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-[#5f6b73]">
                      Página {totalPaginas === 0 ? 0 : paginaActual} de {totalPaginas}
                    </p>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={irPaginaAnterior}
                        disabled={paginaActual <= 1 || totalPaginas === 0}
                        className="rounded-2xl border border-[#cfd4d8] bg-white px-4 py-2 text-sm font-semibold text-[#264f63] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ← Anterior
                      </button>

                      <button
                        type="button"
                        onClick={irPaginaSiguiente}
                        disabled={
                          paginaActual >= totalPaginas || totalPaginas === 0
                        }
                        className="rounded-2xl border border-[#cfd4d8] bg-white px-4 py-2 text-sm font-semibold text-[#264f63] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Siguiente →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
