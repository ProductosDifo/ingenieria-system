"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { obtenerUsuarioActual, type UsuarioActual } from "@/lib/usuarioActual";

type ResumenDashboard = {
  salidasDia: number;
  prestamosActivos: number;
  herramientasPendientes: number;
  devolucionesDia: number;
};

type PrestamoActivo = {
  id: number;
  folio: number;
  fecha: string;
  solicitante: string;
  codigo: string;
  articulo: string;
  descripcion: string;
  cantidad: number;
  diasAtraso: number;
  costoValorFisico: number;
};

type LineaHerramientaRaw = {
  id: number;
  articulo_id: number | null;
  codigo_barras: string | null;
  nombre: string | null;
  descripcion: string | null;
  tipo: string | null;
  cantidad_salida: number | null;
  cantidad_devuelta: number | null;
  salida:
    | {
        id: number;
        folio: number;
        fecha: string;
        solicitante: string;
      }
    | {
        id: number;
        folio: number;
        fecha: string;
        solicitante: string;
      }[]
    | null;
  articulo:
    | {
        costo_unitario: number | null;
      }
    | {
        costo_unitario: number | null;
      }[]
    | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatFolioSalida(folio: number) {
  return `SAL-${String(folio).padStart(3, "0")}`;
}

function daysBetween(fecha: string) {
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const fechaBase = new Date(fecha);
  const inicioFecha = new Date(
    fechaBase.getFullYear(),
    fechaBase.getMonth(),
    fechaBase.getDate()
  );

  const diffMs = inicioHoy.getTime() - inicioFecha.getTime();

  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getSingleRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [usuarioActual, setUsuarioActual] = useState<UsuarioActual | null>(
    null
  );

  const [resumen, setResumen] = useState<ResumenDashboard>({
    salidasDia: 0,
    prestamosActivos: 0,
    herramientasPendientes: 0,
    devolucionesDia: 0,
  });

  const [prestamos, setPrestamos] = useState<PrestamoActivo[]>([]);

  useEffect(() => {
    async function cargarUsuarioActual() {
      const usuario = await obtenerUsuarioActual();
      setUsuarioActual(usuario);
    }

    cargarUsuarioActual();
  }, []);

  useEffect(() => {
    async function cargarDashboard() {
      setLoading(true);
      setErrorMsg("");

      const ahora = new Date();

      const inicioDia = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate(),
        0,
        0,
        0,
        0
      );

      const finDia = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate() + 1,
        0,
        0,
        0,
        0
      );

      const inicioDiaIso = inicioDia.toISOString();
      const finDiaIso = finDia.toISOString();

      const [salidasDiaResp, devolucionesDiaResp, herramientasResp] =
        await Promise.all([
          supabase
            .from("salidas")
            .select("*", { count: "exact", head: true })
            .gte("fecha", inicioDiaIso)
            .lt("fecha", finDiaIso),

          supabase
            .from("devoluciones")
            .select("*", { count: "exact", head: true })
            .gte("fecha", inicioDiaIso)
            .lt("fecha", finDiaIso),

          supabase
            .from("salidas_detalle")
            .select(
              `
              id,
              articulo_id,
              codigo_barras,
              nombre,
              descripcion,
              tipo,
              cantidad_salida,
              cantidad_devuelta,
              salida:salidas!inner (
                id,
                folio,
                fecha,
                solicitante
              ),
              articulo:articulos!inner (
                costo_unitario
              )
            `
            )
            .eq("tipo", "Herramienta")
            .order("id", { ascending: false }),
        ]);

      if (salidasDiaResp.error) {
        console.error("Error cargando salidas del día:", salidasDiaResp.error);
      }

      if (devolucionesDiaResp.error) {
        console.error(
          "Error cargando devoluciones del día:",
          devolucionesDiaResp.error
        );
      }

      if (herramientasResp.error) {
        console.error(
          "Error cargando herramientas activas:",
          herramientasResp.error
        );

        setErrorMsg("No se pudo cargar el resumen del dashboard.");
        setLoading(false);
        return;
      }

      const lineasHerramienta =
        (herramientasResp.data || []) as LineaHerramientaRaw[];

      const prestamosActivosRows = lineasHerramienta
        .map((row) => {
          const salida = getSingleRelation(row.salida);
          const articulo = getSingleRelation(row.articulo);

          if (!salida) return null;

          const cantidadSalida = Number(row.cantidad_salida || 0);
          const cantidadDevuelta = Number(row.cantidad_devuelta || 0);
          const cantidadPendiente = cantidadSalida - cantidadDevuelta;

          if (cantidadPendiente <= 0) return null;

          const costoUnitario = Number(articulo?.costo_unitario || 0);

          return {
            id: row.id,
            folio: salida.folio,
            fecha: salida.fecha,
            solicitante: salida.solicitante,
            codigo: row.codigo_barras || "",
            articulo: row.nombre || "",
            descripcion: row.descripcion || "",
            cantidad: cantidadPendiente,
            cantidadPendiente,
            diasAtraso: daysBetween(salida.fecha),
            costoValorFisico: costoUnitario * cantidadPendiente,
          };
        })
        .filter(Boolean) as (PrestamoActivo & {
        cantidadPendiente: number;
      })[];

      setResumen({
        salidasDia: salidasDiaResp.count || 0,
        prestamosActivos: prestamosActivosRows.length,
        herramientasPendientes: prestamosActivosRows.reduce(
          (acc, item) => acc + item.cantidadPendiente,
          0
        ),
        devolucionesDia: devolucionesDiaResp.count || 0,
      });

      setPrestamos(
        prestamosActivosRows.map(({ cantidadPendiente, ...item }) => item)
      );

      setLoading(false);
    }

    cargarDashboard();
  }, []);

  const prestamosOrdenados = useMemo(() => {
    return [...prestamos].sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();

      return fechaA - fechaB;
    });
  }, [prestamos]);

  const totalLineasPrestamo = useMemo(() => {
    return prestamosOrdenados.length;
  }, [prestamosOrdenados]);

  const totalCantidadPendiente = useMemo(() => {
    return prestamosOrdenados.reduce(
      (acc, item) => acc + Number(item.cantidad || 0),
      0
    );
  }, [prestamosOrdenados]);

  const totalValorFisicoPendiente = useMemo(() => {
    return prestamosOrdenados.reduce(
      (acc, item) => acc + Number(item.costoValorFisico || 0),
      0
    );
  }, [prestamosOrdenados]);

  return (
    <div className="min-h-screen bg-[#e7ecef]">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1">
          <header className="flex items-center justify-between border-b border-[#d7dde1] bg-white px-8 py-5">
            <div>
              <h1 className="text-2xl font-bold text-[#111111]">
                Panel de Ingeniería
              </h1>
              <p className="mt-1 text-sm text-[#5f6b73]">
                Resumen general del sistema
              </p>
            </div>

            <div className="rounded-2xl bg-[#eef2f4] px-4 py-2 text-sm font-semibold text-[#264f63]">
              Usuario:{" "}
              {usuarioActual
                ? `${usuarioActual.nombre} · ${usuarioActual.rol}`
                : "Sin usuario"}
            </div>
          </header>

          <section className="p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-[#111111]">Inicio</h2>
              <p className="mt-2 text-sm text-[#5f6b73]">
                Consulta rápida del estado de salidas, préstamos y devoluciones.
              </p>
            </div>

            {errorMsg ? (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            ) : null}

            <div className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-white p-6 shadow-md">
                <p className="text-sm text-[#5f6b73]">
                  Salidas registradas del día
                </p>
                <h3 className="mt-3 text-4xl font-bold text-[#264f63]">
                  {loading ? "..." : resumen.salidasDia}
                </h3>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-md">
                <p className="text-sm text-[#5f6b73]">Préstamos activos</p>
                <h3 className="mt-3 text-4xl font-bold text-[#264f63]">
                  {loading ? "..." : resumen.prestamosActivos}
                </h3>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-md">
                <p className="text-sm text-[#5f6b73]">
                  Herramientas pendientes a devolver
                </p>
                <h3 className="mt-3 text-4xl font-bold text-[#264f63]">
                  {loading ? "..." : resumen.herramientasPendientes}
                </h3>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-md">
                <p className="text-sm text-[#5f6b73]">Devoluciones del día</p>
                <h3 className="mt-3 text-4xl font-bold text-[#264f63]">
                  {loading ? "..." : resumen.devolucionesDia}
                </h3>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-md">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-[#111111]">
                  Resumen de herramientas en préstamo
                </h3>
                <p className="mt-1 text-sm text-[#5f6b73]">
                  Seguimiento de salidas tipo herramienta con devolución
                  pendiente.
                </p>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">Líneas en préstamo</p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {loading ? "..." : totalLineasPrestamo}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">
                    Cantidad total pendiente
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {loading ? "..." : totalCantidadPendiente}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">
                    Valor físico pendiente
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {loading
                      ? "..."
                      : formatCurrency(totalValorFisicoPendiente)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-sm text-[#5f6b73]">
                      <th className="px-4 py-2">Folio salida</th>
                      <th className="px-4 py-2">Fecha salida</th>
                      <th className="px-4 py-2">Solicitante</th>
                      <th className="px-4 py-2">Artículo</th>
                      <th className="px-4 py-2">Descripción</th>
                      <th className="px-4 py-2">Pendiente</th>
                      <th className="px-4 py-2">Días de atraso</th>
                      <th className="px-4 py-2">Valor físico</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="rounded-2xl bg-[#f7f8fa] px-4 py-6 text-center text-sm text-[#5f6b73]"
                        >
                          Cargando resumen...
                        </td>
                      </tr>
                    ) : prestamosOrdenados.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="rounded-2xl bg-[#f7f8fa] px-4 py-6 text-center text-sm text-[#5f6b73]"
                        >
                          No hay herramientas pendientes de devolución.
                        </td>
                      </tr>
                    ) : (
                      prestamosOrdenados.map((item) => (
                        <tr key={item.id} className="bg-[#f7f8fa]">
                          <td className="rounded-l-2xl px-4 py-4 text-sm font-semibold text-[#264f63]">
                            {formatFolioSalida(item.folio)}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {formatDate(item.fecha)}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {item.solicitante}
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-[#264f63]">
                            {item.articulo}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {item.descripcion}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {item.cantidad}
                          </td>

                          <td className="px-4 py-4">
                            <span className="rounded-full bg-[#264f63] px-3 py-1 text-xs font-semibold text-white">
                              {item.diasAtraso}{" "}
                              {item.diasAtraso === 1 ? "día" : "días"}
                            </span>
                          </td>

                          <td className="rounded-r-2xl px-4 py-4 text-sm font-semibold text-[#111111]">
                            {formatCurrency(item.costoValorFisico)}
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
