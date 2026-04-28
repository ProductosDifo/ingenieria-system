"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type SalidaLinea = {
  id: number;
  fecha: string;
  hora: string;
  folio: string;
  ticket: string;
  solicitante: string;
  area: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  cantidadRetirada: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  valorSalida: number;
};

type SalidaDetalleRaw = {
  id: number;
  codigo_barras: string | null;
  nombre: string | null;
  descripcion: string | null;
  tipo: string | null;
  cantidad_actual: number | null;
  cantidad_salida: number | null;
  cantidad_nueva: number | null;
  created_at: string | null;
  articulo:
    | {
        costo_unitario: number | null;
      }
    | {
        costo_unitario: number | null;
      }[]
    | null;
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
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

export default function ConsultarSalidasPage() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(getTodayForInput());
  const [salidas, setSalidas] = useState<SalidaLinea[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function cargarSalidas() {
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
          cantidad_actual,
          cantidad_salida,
          cantidad_nueva,
          created_at,
          articulo:articulos!salidas_detalle_articulo_id_fkey (
            costo_unitario
          ),
          salida:salidas!salidas_detalle_salida_id_fkey!inner (
            folio,
            fecha,
            ticket,
            solicitante,
            area
          )
        `
        )
        .gte("salida.fecha", inicio)
        .lte("salida.fecha", fin)
        .neq("tipo", "Herramienta")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando salidas:", error);
        setSalidas([]);
        setLoading(false);
        return;
      }

      const rows = ((data || []) as SalidaDetalleRaw[]).map((item) => {
        const salida = getSingleRelation(item.salida);
        const articulo = getSingleRelation(item.articulo);

        const cantidadRetirada = Number(item.cantidad_salida || 0);
        const costoUnitario = Number(articulo?.costo_unitario || 0);

        const fechaBase = salida?.fecha || item.created_at || new Date().toISOString();

        return {
          id: item.id,
          fecha: formatDateCell(fechaBase),
          hora: formatTimeCell(fechaBase),
          folio: formatFolio(Number(salida?.folio || 0)),
          ticket: salida?.ticket || "",
          solicitante: salida?.solicitante || "",
          area: salida?.area || "",
          codigo: item.codigo_barras || "",
          nombre: item.nombre || "",
          descripcion: item.descripcion || "",
          tipo: item.tipo || "",
          cantidadRetirada,
          cantidadAnterior: Number(item.cantidad_actual || 0),
          cantidadNueva: Number(item.cantidad_nueva || 0),
          valorSalida: costoUnitario * cantidadRetirada,
        };
      });

      setSalidas(rows);
      setLoading(false);
    }

    cargarSalidas();
  }, [fechaSeleccionada]);

  const totalLineas = salidas.length;

  const totalRetirado = useMemo(() => {
    return salidas.reduce((acc, item) => acc + item.cantidadRetirada, 0);
  }, [salidas]);

  const totalValorSalida = useMemo(() => {
    return salidas.reduce((acc, item) => acc + item.valorSalida, 0);
  }, [salidas]);

  const exportarExcel = () => {
    if (salidas.length === 0) {
      alert("No hay registros para exportar en la fecha seleccionada.");
      return;
    }

   const data = salidas.map((item) => ({
  "Ubicación de origen": "Ingenieria : Refacciones I",
  "Ubicación de destino": "Ingenieria : Salidas",
  "Subsidiaria": "Empresa principal : PRODUCTOS DIFO",

  "Fecha": item.fecha,
  "Nota": item.ticket, // 👈 aquí cambias Ticket → Nota

  "Artículo": item.codigo, // ⚠️ usa código, no nombre (esto es crítico)
  "Descripción": item.descripcion,

  "Cantidad": item.cantidadRetirada,
  "Unidades": "pzs", // 👈 fijo
}));


    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Salidas");
    XLSX.writeFile(
      workbook,
      `salidas_${fechaSeleccionada.replaceAll("-", "")}.xlsx`
    );
  };

  return (
    <div className="min-h-screen bg-[#e7ecef]">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1">
          <header className="border-b border-[#d7dde1] bg-white px-8 py-5">
            <h1 className="text-2xl font-bold text-[#111111]">
              Consultar salidas
            </h1>
            <p className="mt-1 text-sm text-[#5f6b73]">
              Consulta todas las líneas de salida del día seleccionado y exporta
              a Excel.
            </p>
          </header>

          <section className="space-y-6 p-8">
            <div className="rounded-3xl bg-white p-6 shadow-md">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                  <p className="text-sm text-[#5f6b73]">Total retirado</p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {loading ? "..." : totalRetirado}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">Valor total de salida</p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {loading ? "..." : formatCurrency(totalValorSalida)}
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
                  Salidas del día
                </h2>
                <p className="mt-1 text-sm text-[#5f6b73]">
                  Vista corrida por línea de artículo, sin agrupar por folio.
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
                      <th className="px-4 py-2">Nombre</th>
                      <th className="px-4 py-2">Descripción</th>
                      <th className="px-4 py-2">Tipo</th>
                      <th className="px-4 py-2">Cant. retirada</th>
                      <th className="px-4 py-2">Cant. anterior</th>
                      <th className="px-4 py-2">Cant. nueva</th>
                      <th className="px-4 py-2">Valor de salida</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={14}
                          className="rounded-2xl bg-[#f7f8fa] px-4 py-6 text-center text-sm text-[#5f6b73]"
                        >
                          Cargando salidas...
                        </td>
                      </tr>
                    ) : salidas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={14}
                          className="rounded-2xl bg-[#f7f8fa] px-4 py-6 text-center text-sm text-[#5f6b73]"
                        >
                          No hay salidas registradas para la fecha seleccionada.
                        </td>
                      </tr>
                    ) : (
                      salidas.map((item) => (
                        <tr key={item.id} className="bg-[#f7f8fa]">
                          <td className="rounded-l-2xl px-4 py-4 text-sm text-[#111111]">
                            {item.fecha}
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
                            {item.tipo}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {item.cantidadRetirada}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {item.cantidadAnterior}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {item.cantidadNueva}
                          </td>
                          <td className="rounded-r-2xl px-4 py-4 text-sm font-semibold text-[#111111]">
                            {formatCurrency(item.valorSalida)}
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
