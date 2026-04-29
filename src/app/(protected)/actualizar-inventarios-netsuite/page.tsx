"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type FilaInventarioNetSuite = {
  idInterno: number;
  nombre: string;
  descripcion: string;
  tipo: string;
  codigoBarras: string;
  ubicacion: string;
  existencia: number;
  costoUnitario: number;
  valorFisico: number;
};

type EstadoCarga = "idle" | "loaded" | "importing" | "success" | "error";

function normalizarTexto(valor: unknown) {
  return String(valor ?? "").trim();
}

function convertirNumero(valor: unknown) {
  if (typeof valor === "number") return valor;

  const limpio = String(valor ?? "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .trim();

  const numero = Number(limpio);
  return Number.isNaN(numero) ? 0 : numero;
}

function convertirEntero(valor: unknown) {
  const texto = String(valor ?? "").trim();

  if (!texto) return 0;

  const esSoloMilesConPunto = /^\d{1,3}(\.\d{3})+$/.test(texto);
  if (esSoloMilesConPunto) {
    const numero = Number(texto.replace(/\./g, ""));
    return Number.isNaN(numero) ? 0 : Math.trunc(numero);
  }

  const numero = convertirNumero(texto);
  return Number.isNaN(numero) ? 0 : Math.trunc(numero);
}

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function trocear<T>(arreglo: T[], tamano: number) {
  const resultado: T[][] = [];

  for (let i = 0; i < arreglo.length; i += tamano) {
    resultado.push(arreglo.slice(i, i + tamano));
  }

  return resultado;
}

export default function ActualizarInventariosNetSuitePage() {
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [filas, setFilas] = useState<FilaInventarioNetSuite[]>([]);
  const [errores, setErrores] = useState<string[]>([]);
  const [estado, setEstado] = useState<EstadoCarga>("idle");
  const [resumenImportacion, setResumenImportacion] = useState<{
    procesados: number;
    insertados: number;
    eliminados: number;
    sincronizacion: string;
  } | null>(null);

  const totalRegistros = filas.length;

  const totalExistencia = useMemo(() => {
    return filas.reduce((acc, fila) => acc + fila.existencia, 0);
  }, [filas]);

  const valorTotal = useMemo(() => {
    return filas.reduce((acc, fila) => acc + fila.valorFisico, 0);
  }, [filas]);

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setEstado("idle");
    setErrores([]);
    setFilas([]);
    setResumenImportacion(null);
    setNombreArchivo(archivo.name);

    try {
      const buffer = await archivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const nombreHoja = workbook.SheetNames[0];
      const hoja = workbook.Sheets[nombreHoja];

      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
        defval: "",
      });

      if (!json.length) {
        setErrores(["El archivo no contiene registros."]);
        setEstado("error");
        return;
      }

      const columnasOriginales = Object.keys(json[0]);
      const columnasNormalizadas = columnasOriginales.map((c) =>
        c.toLowerCase().trim()
      );

      const posiblesColumnas = {
        idInterno: ["id interno", "id_interno", "internal id", "internalid"],
        nombre: ["nombre", "name"],
        descripcion: ["descripcion", "descripción", "description"],
        tipo: ["tipo", "type"],
        codigoBarras: [
          "codigo_barras",
          "código_barras",
          "codigo barras",
          "código barras",
        ],
        ubicacion: ["ubicacion", "ubicación", "location"],
        existencia: ["existencia", "cantidad", "onhand", "stock"],
        costoUnitario: [
          "costo_unitario",
          "costo unitario",
          "costounitario",
          "unitcost",
          "costo",
        ],
        valorFisico: ["valor_fisico", "valor fisico", "valorfisico"],
      };

      const encontrarColumna = (opciones: string[]) =>
        opciones.find((opcion) => columnasNormalizadas.includes(opcion));

      const colIdInterno = encontrarColumna(posiblesColumnas.idInterno);
      const colNombre = encontrarColumna(posiblesColumnas.nombre);
      const colDescripcion = encontrarColumna(posiblesColumnas.descripcion);
      const colTipo = encontrarColumna(posiblesColumnas.tipo);
      const colCodigoBarras = encontrarColumna(posiblesColumnas.codigoBarras);
      const colUbicacion = encontrarColumna(posiblesColumnas.ubicacion);
      const colExistencia = encontrarColumna(posiblesColumnas.existencia);
      const colCostoUnitario = encontrarColumna(posiblesColumnas.costoUnitario);
      const colValorFisico = encontrarColumna(posiblesColumnas.valorFisico);

      const faltantes: string[] = [];

      if (!colIdInterno) faltantes.push("ID interno");
      if (!colNombre) faltantes.push("nombre");
      if (!colDescripcion) faltantes.push("descripcion");
      if (!colTipo) faltantes.push("tipo");
      if (!colCodigoBarras) faltantes.push("codigo_barras");
      if (!colUbicacion) faltantes.push("ubicacion");
      if (!colExistencia) faltantes.push("existencia");
      if (!colCostoUnitario) faltantes.push("costo_unitario");
      if (!colValorFisico) faltantes.push("valor_fisico");

      if (faltantes.length > 0) {
        setErrores([
          `Faltan columnas obligatorias en el archivo: ${faltantes.join(", ")}`,
        ]);
        setEstado("error");
        return;
      }

      const colIdInternoKey = colIdInterno!;
      const colNombreKey = colNombre!;
      const colDescripcionKey = colDescripcion!;
      const colTipoKey = colTipo!;
      const colCodigoBarrasKey = colCodigoBarras!;
      const colUbicacionKey = colUbicacion!;
      const colExistenciaKey = colExistencia!;
      const colCostoUnitarioKey = colCostoUnitario!;
      const colValorFisicoKey = colValorFisico!;

      const filasParseadas: FilaInventarioNetSuite[] = json.map(
        (filaOriginal) => {
          const entradaNormalizada = Object.fromEntries(
            Object.entries(filaOriginal).map(([key, value]) => [
              key.toLowerCase().trim(),
              value,
            ])
          );

          const existencia = convertirEntero(
            entradaNormalizada[colExistenciaKey]
          );

          const costoUnitario = convertirNumero(
            entradaNormalizada[colCostoUnitarioKey]
          );

          const valorFisicoArchivo = convertirNumero(
            entradaNormalizada[colValorFisicoKey]
          );

          return {
            idInterno: convertirEntero(entradaNormalizada[colIdInternoKey]),
            nombre: normalizarTexto(entradaNormalizada[colNombreKey]),
            descripcion: normalizarTexto(
              entradaNormalizada[colDescripcionKey]
            ),
            tipo: normalizarTexto(entradaNormalizada[colTipoKey]),
            codigoBarras: normalizarTexto(
              entradaNormalizada[colCodigoBarrasKey]
            ),
            ubicacion: normalizarTexto(entradaNormalizada[colUbicacionKey]),
            existencia,
            costoUnitario,
            valorFisico:
              valorFisicoArchivo > 0
                ? valorFisicoArchivo
                : existencia * costoUnitario,
          };
        }
      );

      const erroresValidacion: string[] = [];
      const clavesInventario = new Set<string>();

      filasParseadas.forEach((fila, index) => {
        const numeroFila = index + 2;

        if (!fila.idInterno || fila.idInterno <= 0) {
          erroresValidacion.push(`Fila ${numeroFila}: ID interno inválido.`);
        }

        if (!fila.nombre) {
          erroresValidacion.push(`Fila ${numeroFila}: nombre vacío.`);
        }

        if (!fila.tipo) {
          erroresValidacion.push(`Fila ${numeroFila}: tipo vacío.`);
        }

        if (!fila.codigoBarras) {
          erroresValidacion.push(`Fila ${numeroFila}: codigo_barras vacío.`);
        }

        if (!fila.ubicacion) {
          erroresValidacion.push(`Fila ${numeroFila}: ubicacion vacía.`);
        }

        const codigoNormalizado = fila.codigoBarras.trim().toUpperCase();
        const ubicacionNormalizada = fila.ubicacion.trim().toUpperCase();
        const claveInventario = `${codigoNormalizado}__${ubicacionNormalizada}`;

        if (
          codigoNormalizado &&
          ubicacionNormalizada &&
          clavesInventario.has(claveInventario)
        ) {
          erroresValidacion.push(
            `Fila ${numeroFila}: artículo duplicado en la misma ubicación (${fila.codigoBarras} - ${fila.ubicacion}).`
          );
        } else {
          clavesInventario.add(claveInventario);
        }
      });

      setFilas(filasParseadas);

      if (erroresValidacion.length > 0) {
        setErrores(erroresValidacion);
        setEstado("error");
        return;
      }

      setEstado("loaded");
    } catch (error) {
      console.error(error);
      setErrores([
        "No se pudo leer el archivo. Verifica que sea CSV o Excel válido.",
      ]);
      setEstado("error");
    }
  };

  const handleImportar = async () => {
    if (!filas.length) {
      alert("Primero debes cargar un archivo válido.");
      return;
    }

    const confirmar = window.confirm(
      "Esto eliminará todos los artículos actuales y cargará el inventario nuevo. ¿Deseas continuar?"
    );

    if (!confirmar) return;

    setEstado("importing");
    setErrores([]);
    setResumenImportacion(null);

    try {
      const sincronizacion = new Date().toISOString();

      const payload = filas.map((fila) => ({
        id_interno: fila.idInterno,
        nombre: fila.nombre,
        descripcion: fila.descripcion,
        tipo: fila.tipo,
        codigo_barras: fila.codigoBarras,
        ubicacion: fila.ubicacion,
        existencia: fila.existencia,
        costo_unitario: fila.costoUnitario,
        valor_fisico: fila.valorFisico,
        activo: true,
        ultima_sincronizacion: sincronizacion,
      }));

      const { data: eliminadosData, error: eliminarError } = await supabase
        .from("articulos")
        .delete()
        .neq("id", -1)
        .select("id");

      if (eliminarError) {
        throw eliminarError;
      }

      const bloques = trocear(payload, 500);
      let totalInsertados = 0;

      for (const bloque of bloques) {
        const { error } = await supabase.from("articulos").insert(bloque);

        if (error) {
          throw error;
        }

        totalInsertados += bloque.length;
      }

      setResumenImportacion({
        procesados: filas.length,
        insertados: totalInsertados,
        eliminados: eliminadosData?.length || 0,
        sincronizacion,
      });

      setEstado("success");

      alert(
        "Inventario reemplazado correctamente. Se eliminaron los artículos anteriores y se cargó el nuevo inventario."
      );
    } catch (error: any) {
      console.error("Error importando inventario:", error);
      setEstado("error");
      setErrores([
        error?.message || "Ocurrió un error al importar la información.",
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-[#e7ecef]">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1">
          <header className="border-b border-[#d7dde1] bg-white px-8 py-5">
            <h1 className="text-2xl font-bold text-[#111111]">
              Actualizar inventarios con NetSuite
            </h1>
            <p className="mt-1 text-sm text-[#5f6b73]">
              Importa el archivo de NetSuite para reemplazar el inventario
              vigente del sistema.
            </p>
          </header>

          <section className="space-y-6 p-8">
            <div className="rounded-3xl bg-white p-6 shadow-md">
              <h2 className="mb-4 text-xl font-bold text-[#111111]">
                Cargar archivo de NetSuite
              </h2>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="xl:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-[#111111]">
                    Archivo CSV o Excel
                  </label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleArchivo}
                    className="w-full rounded-2xl border border-[#cfd4d8] bg-white px-4 py-3 outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-[#264f63] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">Archivo cargado</p>
                  <p className="mt-2 break-words text-sm font-semibold text-[#264f63]">
                    {nombreArchivo || "Sin archivo"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">Estado</p>
                  <p className="mt-2 text-sm font-semibold text-[#264f63]">
                    {estado === "idle" && "Esperando archivo"}
                    {estado === "loaded" && "Archivo validado"}
                    {estado === "importing" && "Importando..."}
                    {estado === "success" && "Importación completada"}
                    {estado === "error" && "Con errores"}
                  </p>
                </div>
              </div>

              {errores.length > 0 && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-red-700">
                    Errores encontrados
                  </p>
                  <ul className="space-y-1 text-sm text-red-700">
                    {errores.slice(0, 15).map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>

                  {errores.length > 15 && (
                    <p className="mt-3 text-sm font-semibold text-red-700">
                      Hay más errores. Corrige primero los mostrados y vuelve a
                      cargar el archivo.
                    </p>
                  )}
                </div>
              )}

              {resumenImportacion && (
                <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-700">
                    Importación completada
                  </p>
                  <p className="mt-2 text-sm text-green-700">
                    Procesados: {resumenImportacion.procesados}
                  </p>
                  <p className="text-sm text-green-700">
                    Insertados: {resumenImportacion.insertados}
                  </p>
                  <p className="text-sm text-green-700">
                    Artículos eliminados antes de importar:{" "}
                    {resumenImportacion.eliminados}
                  </p>
                  <p className="text-sm text-green-700">
                    Sincronización:{" "}
                    {new Date(
                      resumenImportacion.sincronizacion
                    ).toLocaleString("es-MX")}
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleImportar}
                  disabled={!filas.length || estado === "importing"}
                  className="rounded-2xl bg-[#264f63] px-6 py-3 font-semibold text-white transition hover:bg-[#2f5b72] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {estado === "importing"
                    ? "Importando a Supabase..."
                    : "Reemplazar inventario"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-md">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">Registros cargados</p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {totalRegistros}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">Existencia total</p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {totalExistencia}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-[#5f6b73]">
                    Valor total en archivo
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#264f63]">
                    {formatearMoneda(valorTotal)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-md">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-[#111111]">
                  Vista previa del archivo
                </h2>
                <p className="mt-1 text-sm text-[#5f6b73]">
                  Revisa los datos antes de reemplazar el inventario del
                  sistema.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-sm text-[#5f6b73]">
                      <th className="px-4 py-2">ID interno</th>
                      <th className="px-4 py-2">Nombre</th>
                      <th className="px-4 py-2">Descripción</th>
                      <th className="px-4 py-2">Tipo</th>
                      <th className="px-4 py-2">Código</th>
                      <th className="px-4 py-2">Ubicación</th>
                      <th className="px-4 py-2">Existencia</th>
                      <th className="px-4 py-2">Costo unitario</th>
                      <th className="px-4 py-2">Valor físico</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="rounded-2xl bg-[#f7f8fa] px-4 py-6 text-center text-sm text-[#5f6b73]"
                        >
                          No hay archivo cargado todavía.
                        </td>
                      </tr>
                    ) : (
                      filas.slice(0, 50).map((fila, index) => (
                        <tr
                          key={`${fila.idInterno}-${fila.codigoBarras}-${fila.ubicacion}-${index}`}
                          className="bg-[#f7f8fa]"
                        >
                          <td className="rounded-l-2xl px-4 py-4 text-sm font-semibold text-[#264f63]">
                            {fila.idInterno}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {fila.nombre}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {fila.descripcion}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {fila.tipo}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {fila.codigoBarras}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {fila.ubicacion}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {fila.existencia}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#111111]">
                            {formatearMoneda(fila.costoUnitario)}
                          </td>
                          <td className="rounded-r-2xl px-4 py-4 text-sm font-semibold text-[#264f63]">
                            {formatearMoneda(fila.valorFisico)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filas.length > 50 && (
                <p className="mt-4 text-sm text-[#5f6b73]">
                  Mostrando 50 registros de {filas.length} cargados.
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
