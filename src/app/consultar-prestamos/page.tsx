"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type PrestamoLinea = {
  id: number;
  fechaPrestamo: string;
  hora: string;
  folio: string;
  ticket: string;
  solicitante: string;
  area: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  cantidadPrestada: number;
  cantidadDevuelta: number;
  cantidadPendiente: number;
  fechaCompromiso: string;
  valorPrestamo: number;
};

type PrestamoDetalleRaw = {
  id: number;
  codigo_barras: string | null;
  nombre: string | null;
  descripcion: string | null;
  tipo: string | null;
  cantidad_salida: number | null;
  cantidad_devuelta: number | null;
  created_at: string | null;
  salida:
    | {
        folio: number;
        fecha: string;
        ticket: string | null;
        solicitante: string;
        area: string;
      }
    | {
        folio: number;
        fecha: string;
        ticket: string | null;
        solicitante: string;
        area: string;
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

function getTodayForInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

function getSingleRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDateCell(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatTimeCell(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatFolio(folio: number) {
  return `SAL-${String(folio).padStart(3, "0")}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
}

function calcularDiasAtraso(fechaCompromiso: string, cantidadPendiente: number) {
  if (cantidadPendiente <= 0) return 0;

  const hoy = new Date();
  const compromiso = new Date(`${fechaCompromiso}T00:00:00`);
  const diff = Math.floor(
    (hoy.getTime() - compromiso.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diff > 0 ? diff : 0;
}

function obtenerEstatus(fechaCompromiso: string, cantidadPendiente: number) {
  if (cantidadPendiente <= 0) return "Devuelto";

  const diasAtraso = calcularDiasAtraso(fechaCompromiso, cantidadPendiente);

  if (diasAtraso > 0) return "Vencido";
  return "Pendiente";
}

export default function ConsultarPrestamosPage() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(getTodayForInput());
  const [prestamos, setPrestamos] = useState<PrestamoLinea[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function cargarPrestamos() {
      setLoading(true);

      const inicio = `${fechaSeleccionada}T00:00:00`;
      const fin = `${fechaSeleccionada}T23:59:59`;

      const { data, error } = await supabase
        .from("salidas_detalle")
        .select(
          `
          id,
          codigo_barras,
          nombre,
          descripcion,
          tipo,
          cantidad_salida,
          cantidad_devuelta,
          created_at,
          salida:salidas!salidas_detalle_salida_id_fkey (
            folio,
            fecha,
            ticket,
            solicitante,
            area
          ),
          articulo:articulos!salidas_detalle_articulo_id_fkey (
            costo_unitario
          )
        `
        )
        .eq("tipo", "Herramienta")
        .gte("created_at", inicio)
        .lte("created_at", fin)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando préstamos:", error);
        setPrestamos([]);
        setLoading(false);
        return;
      }

      const rows = ((data || []) as PrestamoDetalleRaw[]).map((item) => {
        const salida = getSingleRelation(item.salida);
        const articulo = getSingleRelation(item.articulo);
        const fechaBase =
          salida?.fecha || item.created_at || new Date().toISOString();

        const cantidadPrestada = Number(item.cantidad_salida || 0);
        const cantidadDevuelta = Number(item.cantidad_devuelta || 0);
        const cantidadPendiente = cantidadPrestada - cantidadDevuelta;
        const costoUnitario = Number(articulo?.costo_unitario || 0);
        const valorPrestamo = costoUnitario * cantidadPrestada;

        return {
          id: item.id,
          fechaPrestamo: formatDateCell(fechaBase),
          hora: formatTimeCell(fechaBase),
          folio: formatFolio(Number(salida?.folio || 0)),
          ticket: salida?.ticket || "",
          solicitante: salida?.solicitante || "",
          area: salida?.area || "",
          codigo: item.codigo_barras || "",
          nombre: item.nombre || "",
          descripcion: item.descripcion || "",
          cantidadPrestada,
          cantidadDevuelta,
          cantidadPendiente,
          fechaCompromiso: formatDateCell(fechaBase),
          valorPrestamo,
        };
      });

      setPrestamos(rows);
      setLoading(false);
    }

    cargarPrestamos();
  }, [fechaSeleccionada]);

  const totalLineas = prestamos.length;

  const totalPrestado = useMemo(() => {
    return prestamos.reduce((acc, item) => acc + item.cantidadPrestada, 0);
  }, [prestamos]);

  const totalPendiente = useMemo(() => {
    return prestamos.reduce((acc, item) => acc + item.cantidadPendiente, 0);
  }, [prestamos]);

  const totalValorPrestamo = useMemo(() => {
    return prestamos.reduce((acc, item) => acc + item.valorPrestamo, 0);
  }, [prestamos]);

  const exportarExcel = () => {
    if (prestamos.length === 0) {
      alert("No hay préstamos para exportar en la fecha seleccionada.");
      return;
    }

    const data = prestamos.map((item) => ({
      FechaPrestamo: item.fechaPrestamo,
      Hora: item.hora,
      Folio: item.folio,
      Ticket: item.ticket,
      Solicitante: item.solicitante,
      Area: item.area,
      Codigo: item.codigo,
      Herramienta: item.nombre,
      Descripcion: item.descripcion,
      CantidadPrestada: item.cantidadPrestada,
      CantidadDevuelta: item.cantidadDevuelta,
      CantidadPendiente: item.cantidadPendiente,
      FechaCompromiso: item.fechaCompromiso,
      DiasAtraso: calcularDiasAtraso(
        item.fechaCompromiso.split("/").reverse().join("-"),
        item.cantidadPendiente
      ),
      Estatus: obtenerEstatus(
        item.fechaCompromiso.split("/").reverse().join("-"),
        item.cantidadPendiente
      ),
      ValorPrestamo: item.valorPrestamo,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Prestamos");

    XLSX.writeFile(
      workbook,
      `prestamos_${fechaSeleccionada.replaceAll("-", "")}.xlsx`
    );
  };

  return (
    <div className="min-h-screen bg-[#e7ecef]">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1">
          <header className="border-b border-[#d7dde1] bg-white px-8 py-5">
            <h1 className="text-2xl font-bold text-[#111111]">
              Consultar préstamos
            </h1>
            <p className="mt-1 text-sm text-[#5f6b73]">
              Consulta únicamente herramientas prestadas por día, con pendiente y atraso.
            </p>
          </header>

          <section className="space-y-6 p-8">
            <div className="rounded-3xl bg-white p-6 shadow-md">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#111111]">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={fechaSeleccionada}
                    onChange={(e) => setFechaSeleccionada(e.target.value)}
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 py-3 outline-none"
                  />
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">Total de líneas</p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {loading ? "..." : totalLineas}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">Total prestado</p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {loading ? "..." : totalPrestado}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">Total pendiente</p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {loading ? "..." : totalPendiente}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">Valor total préstamo</p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {loading ? "..." : formatCurrency(totalValorPrestamo)}
                  </p>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={exportarExcel}
                    className="w-full rounded-2xl bg-[#264f63] px-6 py-3 font-semibold text-white transition hover:bg-[#2f5b72]"
                  >
                    Exportar a Excel
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-md">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-[#111111]">
                  Préstamos del día
                </h2>
                <p className="mt-1 text-sm text-[#5f6b73]">
                  Vista corrida por línea de herramienta, con seguimiento de pendiente y atraso.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-sm text-[#5f6b73]">
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Hora</th>
                      <th className="px-4 py-2">Folio</th>
                      <th className="px-4 py-2">Ticket</th>
                      <th className="px-4 py-2">Solicitante</th>
                      <th className="px-4 py-2">Área</th>
                      <th className="px-4 py-2">Código</th>
                      <th className="px-4 py-2">Herramienta</th>
                      <th className="px-4 py-2">Descripción</th>
                      <th className="px-4 py-2">Cant. prestada</th>
                      <th className="px-4 py-2">Cant. devuelta</th>
                      <th className="px-4 py-2">Pendiente</th>
                      <th className="px-4 py-2">Fecha compromiso</th>
                      <th className="px-4 py-2">Días atraso</th>
                      <th className="px-4 py-2">Estatus</th>
                      <th className="px-4 py-2">Valor préstamo</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={16}
                          className="rounded-2xl bg-[#f7f8fa] px-4 py-6 text-center text-sm text-[#5f6b73]"
                        >
                          Cargando préstamos...
                        </td>
                      </tr>
                    ) : prestamos.length === 0 ? (
                      <tr>
                        <td
                          colSpan={16}
                          className="rounded-2xl bg-[#f7f8fa] px-4 py-6 text-center text-sm text-[#5f6b73]"
                        >
                          No hay préstamos registrados para la fecha seleccionada.
                        </td>
                      </tr>
                    ) : (
                      prestamos.map((item) => {
                        const fechaCompromisoIso = item.fechaCompromiso
                          .split("/")
                          .reverse()
                          .join("-");

                        const diasAtraso = calcularDiasAtraso(
                          fechaCompromisoIso,
                          item.cantidadPendiente
                        );
                        const estatus = obtenerEstatus(
                          fechaCompromisoIso,
                          item.cantidadPendiente
                        );

                        return (
                          <tr key={item.id} className="bg-[#f7f8fa]">
                            <td className="rounded-l-2xl px-4 py-4 text-sm text-[#111111]">
                              {item.fechaPrestamo}
                            </td>
                            <td className="px-4 py-4 text-sm text-[#111111]">
                              {item.hora}
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-[#264f63]">
                              {item.folio}
                            </td>
                            <td className="px-4 py-4 text-sm text-[#111111]">
                              {item.ticket}
                            </td>
                            <td className="px-4 py-4 text-sm text-[#111111]">
                              {item.solicitante}
                            </td>
                            <td className="px-4 py-4 text-sm text-[#111111]">
                              {item.area}
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-[#264f63]">
                              {item.codigo}
                            </td>
                            <td className="px-4 py-4 text-sm text-[#111111]">
                              {item.nombre}
                            </td>
                            <td className="px-4 py-4 text-sm text-[#111111]">
                              {item.descripcion}
                            </td>
                            <td className="px-4 py-4 text-sm text-[#111111]">
                              {item.cantidadPrestada}
                            </td>
                            <td className="px-4 py-4 text-sm text-[#111111]">
                              {item.cantidadDevuelta}
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-[#111111]">
                              {item.cantidadPendiente}
                            </td>
                            <td className="px-4 py-4 text-sm text-[#111111]">
                              {item.fechaCompromiso}
                            </td>
                            <td className="px-4 py-4 text-sm text-[#111111]">
                              {diasAtraso}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  estatus === "Vencido"
                                    ? "bg-red-100 text-red-700"
                                    : estatus === "Pendiente"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {estatus}
                              </span>
                            </td>
                            <td className="rounded-r-2xl px-4 py-4 text-sm font-semibold text-[#111111]">
                              {formatCurrency(item.valorPrestamo)}
                            </td>
                          </tr>
                        );
                      })
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