'use client';

import { useQuery } from '@tanstack/react-query';
import { MensajeError } from '@/components/Estados';
import { api } from '@/lib/api';
import { fmtFechaHora, fmtUsd, hoyIso, inicioMesIso } from '@/lib/formato';
import type { ListaSalidas } from '@/lib/tipos';
import type { ConfigSalida } from './config';

export function SalidasDelMes({ config }: { config: ConfigSalida }) {
  const desde = inicioMesIso();
  const hasta = hoyIso();
  const { data, error, refetch } = useQuery({
    queryKey: [config.clave, 'mes', desde, hasta],
    queryFn: () => api<ListaSalidas>(`${config.endpoint}?desde=${desde}&hasta=${hasta}&porPagina=100`),
  });

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-mano text-2xl uppercase tracking-wide text-cafe">{config.tituloLista}</h2>
        {data && (
          <p className="text-sm">
            {data.resumen[config.clave]} {config.singular}(s), {data.resumen.unidades} unidad(es), valor{' '}
            <strong className="tabular-nums">{fmtUsd(data.resumen.valorTotalUsd)}</strong>
          </p>
        )}
      </div>
      {error && <MensajeError error={error} alReintentar={() => refetch()} />}
      {data && data.datos.length === 0 && <p className="text-sm text-cafe">{config.vacioLista}</p>}
      {data && data.datos.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead className="border-b-2 border-cafe text-cafe-oscuro">
            <tr>
              <th className="py-2 pr-3 font-semibold">Fecha</th>
              <th className="py-2 pr-3 font-semibold">{config.destino.columna}</th>
              <th className="py-2 pr-3 font-semibold">{config.motivo.columna}</th>
              <th className="py-2 pr-3 font-semibold">Productos</th>
              <th className="py-2 pr-3 text-right font-semibold">Valor</th>
              <th className="py-2 font-semibold">Autorizó</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe/20">
            {data.datos.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{fmtFechaHora(r.fecha)}</td>
                <td className="py-2 pr-3 font-semibold">{r[config.destino.campo]}</td>
                <td className="py-2 pr-3">{r[config.motivo.campo]}</td>
                <td className="py-2 pr-3">
                  {r.detalles.map((d) => (
                    <span key={d.productoId} className="mr-3 inline-block whitespace-nowrap">
                      <strong>{d.codigo}</strong> ×{d.cantidad}
                    </span>
                  ))}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(r.valorTotalUsd)}</td>
                <td className="py-2">{r.autorizadoPor ?? <span className="text-cafe">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
