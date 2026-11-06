"use client";

import { useEffect, useRef, useState } from "react";
import { cerrarTurno } from "@/lib/pos/acciones";
import type { ResumenCaja } from "@/lib/caja/resumen";
import { TablaResumenCaja } from "@/components/caja/TablaResumenCaja";
import { cerrarSesion } from "@/lib/auth/acciones";
import {
  parseMontoBrl,
  parseMontoGs,
} from "@/lib/pos/formato";

export const TIEMPO_CIERRE_SESION_MS = 150_000;
export function CerrarTurno({
  turnoId,
  abierto,
  onCerrar,
}: {
  turnoId: string;
  abierto: string;
  onCerrar: () => void;
}) {
  const [gs, setGs] = useState("0");
  const [brl, setBrl] = useState("0");
  const [error, setError] = useState("");
  const [pendiente, setPendiente] = useState(false);
  const bloqueado = useRef(false);
  const [resumen, setResumen] = useState<ResumenCaja | null>(null);
  useEffect(() => {
    if (!resumen) return;
    let timer: ReturnType<typeof setTimeout>;
    const reiniciar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void cerrarSesion("pos");
      }, TIEMPO_CIERRE_SESION_MS);
    };
    reiniciar();
    window.addEventListener("pointerdown", reiniciar);
    window.addEventListener("keydown", reiniciar);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", reiniciar);
      window.removeEventListener("keydown", reiniciar);
    };
  }, [resumen]);
  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (bloqueado.current) return;
    const g = parseMontoGs(gs),
      b = parseMontoBrl(brl);
    if (g === null || b === null) {
      setError("Ingresá montos válidos.");
      return;
    }
    bloqueado.current = true;
    setPendiente(true);
    setError("");
    try {
      const resultado = await cerrarTurno(turnoId, g, b);
      if (resultado.ok) setResumen(resultado.data);
      else {
        bloqueado.current = false;
        setError(resultado.error);
      }
    } catch (error) {
      bloqueado.current = false;
      throw error;
    } finally {
      setPendiente(false);
    }
  }
  return (
    <section className="w-full max-w-2xl space-y-5">
      <p>Turno abierto: {abierto}</p>
      {!resumen ? (
        <form onSubmit={confirmar} className="space-y-4">
          <label className="block space-y-1">
            Contado ₲
            <input
              className="block min-h-11 w-full rounded-md border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-ring"
              inputMode="numeric"
              value={gs}
              onChange={(e) => setGs(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            Contado R$
            <input
              className="block min-h-11 w-full rounded-md border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-ring"
              inputMode="decimal"
              value={brl}
              onChange={(e) => setBrl(e.target.value)}
            />
          </label>
          <p className="rounded-md bg-aviso-fondo p-3 text-aviso">
            Al confirmar, el conteo queda final. Solo un dueño puede corregirlo.
          </p>
          {error && (
            <p role="alert" className="text-destructive-texto">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCerrar}
              disabled={pendiente}
              className="min-h-11 rounded-md border px-4 focus-visible:outline-2 focus-visible:outline-ring"
            >
              Cancelar
            </button>
            <button
              disabled={pendiente}
              className="min-h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
            >
              Confirmar conteo
            </button>
          </div>
        </form>
      ) : (
        <>
          <TablaResumenCaja resumen={resumen} />
          <button
            onClick={() => void cerrarSesion("pos")}
            className="min-h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            Listo · cerrar sesión
          </button>
        </>
      )}
    </section>
  );
}
