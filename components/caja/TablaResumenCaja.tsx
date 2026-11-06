import type { ResumenCaja } from "@/lib/caja/resumen";
import { formatoGs, formatoBrl } from "@/lib/pos/formato";

const numeroGs = (n: number) =>
  formatoGs(n).replace("₲ ", "").replace("-", "−");
const numeroBrl = (n: number) =>
  formatoBrl(n).replace("R$ ", "").replace("-", "−");

export function TablaResumenCaja({ resumen }: { resumen: ResumenCaja }) {
  const filas = ([
        ["Fondo inicial", resumen.fondoGs, resumen.fondoBrl],
        [
          "+ Ventas en efectivo",
          resumen.ventasEfectivoGs,
          resumen.ventasEfectivoBrl,
        ],
        ...(resumen.entradasGs || resumen.entradasBrl
          ? [["+ Entradas", resumen.entradasGs, resumen.entradasBrl] as const]
          : []),
        ["− Retiros y pagos", -resumen.salidasGs, -resumen.salidasBrl],
        ["= Esperado", resumen.esperadoGs, resumen.esperadoBrl],
        ["Contado", resumen.contadoGs, resumen.contadoBrl],
        ["Diferencia", resumen.diferenciaGs, resumen.diferenciaBrl],
      ] as const);
  return <>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th scope="col">Concepto</th>
                  <th scope="col">₲</th>
                  <th scope="col">R$</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(([nombre, g, b]) => (
                  <tr key={nombre}>
                    <th scope="row" className="py-2 pr-3 font-normal">
                      {nombre}
                    </th>
                    <td
                      className={
                        nombre === "Diferencia"
                          ? g < 0
                            ? "text-destructive-texto"
                            : g === 0
                              ? "text-exito-texto"
                              : ""
                          : ""
                      }
                    >
                      {numeroGs(g)}
                    </td>
                    <td
                      className={
                        nombre === "Diferencia"
                          ? b < 0
                            ? "text-destructive-texto"
                            : b === 0
                              ? "text-exito-texto"
                              : ""
                          : ""
                      }
                    >
                      {numeroBrl(b)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Transferencias {formatoGs(resumen.transferenciasGs)} · Tarjetas{" "}
            {formatoGs(resumen.tarjetasGs)}
          </p>
  </>;
}
