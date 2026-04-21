"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackDebugPage() {
  const [logs, setLogs] = useState<string[]>([]);

  function addLog(message: string) {
    setLogs((prev) => [...prev, message]);
  }

  useEffect(() => {
    async function debugCallback() {
      try {
        addLog("=== INICIO CALLBACK DEBUG ===");
        addLog(`URL completa: ${window.location.href}`);
        addLog(`Search: ${window.location.search}`);

        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const error = params.get("error");
        const errorDescription = params.get("error_description");

        addLog(`code: ${code ? "SI" : "NO"}`);
        addLog(`error param: ${error ?? "null"}`);
        addLog(`error_description: ${errorDescription ?? "null"}`);

        if (!code) {
          addLog("No llegó code en la URL. Aquí está el fallo.");
          return;
        }

        addLog("Intentando exchangeCodeForSession...");

        const { data: exchangeData, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        addLog(
          `exchangeData: ${exchangeData ? JSON.stringify(exchangeData) : "null"}`
        );
        addLog(
          `exchangeError: ${
            exchangeError ? JSON.stringify(exchangeError) : "null"
          }`
        );

        addLog("Consultando getSession...");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        addLog(
          `sessionError: ${sessionError ? JSON.stringify(sessionError) : "null"}`
        );
        addLog(`session existe: ${session ? "SI" : "NO"}`);

        if (session) {
          addLog(`user.id: ${session.user.id}`);
          addLog(`user.email: ${session.user.email ?? "sin email"}`);
        }

        addLog("=== FIN CALLBACK DEBUG ===");
      } catch (err) {
        addLog(`ERROR GENERAL: ${JSON.stringify(err)}`);
      }
    }

    debugCallback();
  }, []);

  return (
    <div className="min-h-screen bg-[#e7ecef] p-6">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-4 text-2xl font-bold text-[#111111]">
          Debug callback Microsoft / Supabase
        </h1>

        <div className="rounded-xl bg-[#111111] p-4 text-sm text-green-400">
          <pre className="whitespace-pre-wrap">
            {logs.length > 0 ? logs.join("\n") : "Cargando..."}
          </pre>
        </div>
      </div>
    </div>
  );
}
