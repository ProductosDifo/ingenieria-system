"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type TipoMovimiento = "SALIDA" | "PRESTAMO";

type DevolucionLinea = {
  id: number;
  fechaDevolucion: string;
  hora: string;
  folioDevolucion: string;
  folioOrigen: string;
  tipoMovimiento: TipoMovimiento;
  ticket: string;
  solicitante: string;
  area: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipoArticulo: string;
  cantidadDevuelta: number;
  recibidoPor: string;
  observaciones: string;
};

type DevolucionRow = {
  id: number;
  folio: number;
  fecha: string;
  observaciones: string | null;
};

type DevolucionDetalleRow = {
  id: number;
  devolucion_id: number;
  salida_detalle_id: number;
  codigo_barras: string | null;
  nombre: string | null;
  descripcion: string | null;
  tipo: string | null;
  cantidad_devuelta: number | null;
};

type SalidaDetalleRow = {
  id: number;
  salida_id: number;
};

type SalidaRow = {
  id: number;
  folio: number;
  fecha: string;
  ticket: string | null;
  solicitante: string;
  area: string;
};

function getTodayForInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
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

function formatFolioDevolucion(folio: number) {
  return `DEV-${String(folio).padStart(3, "0")}`;
}

function formatFolioSalida(folio: number) {
  return `SAL-${String(folio).padStart(3, "0")}`;
}

export default function ConsultarDevolucionesPage() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(getTodayForInput());
  const [devoluciones, setDevoluciones] = useState<DevolucionLinea[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function cargarDevoluciones() {
      setLoading(true);

      try {
        const inicio = `${fechaSeleccionada}T00:00:00`;
        const fin = `${fechaSeleccionada}T23:59:59`;

        const { data: devolucionesData, error: devolucionesError } = await supabase
          .from("devoluciones")
          .select("id, folio, fecha, observaciones")
          .gte("fecha", inicio)
          .lte("fecha", fin)
          .order("fecha", { ascending: false });

        if (devolucionesError) {
          console.error("Error cargando devoluciones:", devolucionesError);
          alert(`Error cargando devoluciones: ${devolucionesError.message}`);
          setDevoluciones([]);
          return;
        }

        const devolucionesRows = (devolucionesData || []) as DevolucionRow[];

        if (devolucionesRows.length === 0) {
          setDevoluciones([]);
          return;
        }

        const devolucionIds = devolucionesRows.map((d) => d.id);

        const { data: detallesData, error: detallesError } = await supabase
          .from("devoluciones_detalle")
          .select(
            "id, devolucion_id, salida_detalle_id, codigo_barras, nombre, descripcion, tipo, cantidad_devuelta"
          )
          .in("devolucion_id", devolucionIds)
          .order("id", { ascending: false });

        if (detallesError) {
          console.error("Error cargando devoluciones_detalle:", detallesError);
          alert(`Error cargando devoluciones_detalle: ${detallesError.message}`);
          setDevoluciones([]);
          return;
        }

        const detalleRows = (detallesData || []) as DevolucionDetalleRow[];

        if (detalleRows.length === 0) {
          setDevoluciones([]);
          return;
        }

        const salidaDetalleIds = [...new Set(detalleRows.map((d) => d.salida_detalle_id))];

        const { data: salidasDetalleData, error: salidasDetalleError } = await supabase
          .from("salidas_detalle")
          .select("id, salida_id")
          .in("id", salidaDetalleIds);

        if (salidasDetalleError) {
          console.error("Error cargando salidas_detalle:", salidasDetalleError);
          alert(`Error cargando salidas_detalle: ${salidasDetalleError.message}`);
          setDevoluciones([]);
          return;
        }

        const salidasDetalleRows = (salidasDetalleData || []) as SalidaDetalleRow[];

        const salidaIds = [...new Set(salidasDetalleRows.map((s) => s.salida_id))];

        const { data: salidasData, error: salidasError } = await supabase
          .from("salidas")
          .select("id, folio, fecha, ticket, solicitante, area")
          .in("id", salidaIds);

        if (salidasError) {
          console.error("Error cargando salidas:", salidasError);
          alert(`Error cargando salidas: ${salidasError.message}`);
          setDevoluciones([]);
          return;
        }

        const salidasRows = (salidasData || []) as SalidaRow[];

        const devolucionesMap = new Map<number, DevolucionRow>();
        devolucionesRows.forEach((row) => devolucionesMap.set(row.id, row));

        const salidaDetalleMap = new Map<number, SalidaDetalleRow>();
        salidasDetalleRows.forEach((row) => salidaDetalleMap.set(row.id, row));

        const salidasMap = new Map<number, SalidaRow>();
        salidasRows.forEach((row) => salidasMap.set(row.id, row));

        const rows: DevolucionLinea[] = detalleRows.map((detalle) => {
          const devolucion = devolucionesMap.get(detalle.devolucion_id);
          const salidaDetalle = salidaDetalleMap.get(detalle.salida_detalle_id);
          const salida = salidaDetalle
            ? salidasMap.get(salidaDetalle.salida_id)
            : undefined;

          const fechaBase = devolucion?.fecha || new Date().toISOString();
          const tipoArticulo = detalle.tipo || "";
          const tipoMovimiento: TipoMovimiento =
            tipoArticulo === "Herramienta" ? "PRESTAMO" : "SALIDA";

          return {
            id: detalle.id,
            fechaDevolucion: formatDateCell(fechaBase),
            hora: formatTimeCell(fechaBase),
            folioDevolucion: formatFolioDevolucion(Number(devolucion?.folio || 0)),
            folioOrigen: formatFolioSalida(Number(salida?.folio || 0)),
            tipoMovimiento,
            ticket: salida?.ticket || "",
            solicitante: salida?.solicitante || "",
            area: salida?.area || "",
            codigo: detalle.codigo_barras || "",
            nombre: detalle.nombre || "",
            descripcion: detalle.descripcion || "",
            tipoArticulo,
            cantidadDevuelta: Number(detalle.cantidad_devuelta || 0),
            recibidoPor: "Admin",
            observaciones: devolucion?.observaciones || "",
          };
        });

        setDevoluciones(rows);
      } catch (error) {
        console.error("Error inesperado en consultar devoluciones:", error);
        setDevoluciones([]);
      } finally {
        setLoading(false);
      }
    }

    cargarDevoluciones();
  }, [fechaSeleccionada]);

  const totalLineas = devoluciones.length;

  const totalDevuelto = useMemo(() => {
    return devoluciones.reduce((acc, item) => acc + item.cantidadDevuelta, 0);
  }, [devoluciones]);

  const totalSalidas = useMemo(() => {
    return devoluciones.filter((item) => item.tipoMovimiento === "SALIDA").length;
  }, [devoluciones]);

  const totalPrestamos = useMemo(() => {
    return devoluciones.filter((item) => item.tipoMovimiento === "PRESTAMO").length;
  }, [devoluciones]);

  const exportarExcel = () => {
    if (devoluciones.length === 0) {
      alert("No hay devoluciones para exportar en la fecha seleccionada.");
      return;
    }

    const data = devoluciones.map((item) => ({
      FechaDevolucion: item.fechaDevolucion,
      Hora: item.hora,
      FolioDevolucion: item.folioDevolucion,
      FolioOrigen: item.folioOrigen,
      TipoMovimiento: item.tipoMovimiento === "PRESTAMO" ? "Préstamo" : "Salida",
      Ticket: item.ticket,
      Solicitante: item.solicitante,
      Area: item.area,
      Codigo: item.codigo,
      Nombre: item.nombre,
      Descripcion: item.descripcion,
      TipoArticulo: item.tipoArticulo,
      CantidadDevuelta: item.cantidadDevuelta,
      RecibidoPor: item.recibidoPor,
      Observaciones: item.observaciones,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Devoluciones");
    XLSX.writeFile(
      workbook,
      `devoluciones_${fechaSeleccionada.replaceAll("-", "")}.xlsx`
    );
  };

  return (
    <div className="min-h-screen bg-[#e7ecef]">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1">
          <header className="border-b border-[#d7dde1] bg-white px-8 py-5">
            <h1 className="text-2xl font-bold text-[#111111]">
              Consultar devoluciones
            </h1>
            <p className="mt-1 text-sm text-[#5f6b73]">
              Consulta todas las devoluciones del día seleccionado, incluyendo salidas y préstamos.
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
                  <p className="text-sm text-[#5f6b73]">Total devuelto</p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {loading ? "..." : totalDevuelto}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">De salida</p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {loading ? "..." : totalSalidas}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">De préstamo</p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {loading ? "..." : totalPrestamos}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={exportarExcel}
                  className="rounded-2xl bg-[#264f63] px-6 py-3 font-semibold text-white transition hover:bg-[#2f5b72]"
                >
                  Exportar a Excel
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-md">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-[#111111]">
                  Devoluciones del día
                </h2>
                <p className="mt-1 text-sm text-[#5f6b73]">
                  Vista corrida por línea de devolución, incluyendo todos los tipos de artículo.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-sm text-[#5f6b73]">
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Hora</th>
                      <th className="px-4 py-2">Folio devolución</th>
                      <th className="px-4 py-2">Folio origen</th>
                      <th className="px-4 py-2">Origen</th>
                      <th className="px-4 py-2">Ticket</th>
                      <th className="px-4 py-2">Solicitante</th>
                      <th className="px-4 py-2">Área</th>
                      <th className="px-4 py-2">Código</th>
                      <th className="px-4 py-2">Nombre</th>
                      <th className="px-4 py-2">Descripción</th>
                      <th className="px-4 py-2">Tipo artículo</th>
                      <th className="px-4 py-2">Cant. devuelta</th>
                      <th className="px-4 py-2">Recibido por</th>
                      <th className="px-4 py-2">Observaciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={15}
                          className="rounded-2xl bg-[#f7f8fa] px-4 py-6 text-center text-sm text-[#5f6b73]"
                        >
                          Cargando devoluciones...
                        </td>
                      </tr>
                    ) : devoluciones.length === 0 ? (
                      <tr>
                        <td
                          colSpan={15}
                          className="rounded-2xl bg-[#f7f8fa] px-4 py-6 text-center text-sm text-[#5f6b73]"
                        >
                          No hay devoluciones registradas para la fecha seleccionada.
                        </td>
                      </tr>
                    ) : (
                      devoluciones.map((item) => (
                        <tr key={item.id} className="bg-[#f7f8fa]">
                          <td className="rounded-l-2xl px-4 py-4 text-sm text-[#111111]">
                            {item.fechaDevolucion}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {item.hora}
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-[#264f63]">
                            {item.folioDevolucion}
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-[#264f63]">
                            {item.folioOrigen}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                item.tipoMovimiento === "PRESTAMO"
                                  ? "bg-[#264f63] text-white"
                                  : "bg-[#eef2f4] text-[#264f63]"
                              }`}
                            >
                              {item.tipoMovimiento === "PRESTAMO"
                                ? "Préstamo"
                                : "Salida"}
                            </span>
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
                            {item.tipoArticulo}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {item.cantidadDevuelta}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {item.recibidoPor}
                          </td>
                          <td className="rounded-r-2xl px-4 py-4 text-sm text-[#111111]">
                            {item.observaciones}
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
