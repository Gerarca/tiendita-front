'use client';

import { useQuery } from '@tanstack/react-query';
import { MensajeError } from '@/components/Estados';
import { api } from '@/lib/api';
import { fmtFechaHora } from '@/lib/formato';
import type { Ingreso, Pagina } from '@/lib/tipos';

export function UltimosIngresos() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['ingresos', 'ultimos'],
    queryFn: () => api<Pagina<Ingreso>>('/ingresos?porPagina=10'),
  });

  return (
    <section className="mt-10">
      <h2 className="mb-3 font-mano text-2xl uppercase tracking-wide text-cafe">Últimos ingresos</h2>
      {isLoading && <p className="text-sm text-cafe">Cargando…</p>}
      {error && <MensajeError error={error} alReintentar={() => refetch()} />}
      {data && data.datos.length === 0 && <p className="text-sm text-cafe">Todavía no hay ingresos registrados.</p>}
      {data && data.datos.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b-2 border-cafe text-cafe-oscuro">
              <tr>
                <th className="py-2 pr-3 font-semibold">Fecha</th>
                <th className="py-2 pr-3 font-semibold">Productos</th>
                <th className="py-2 pr-3 text-right font-semibold">Unidades</th>
                <th className="py-2 pr-3 font-semibold">Registró</th>
                <th className="py-2 font-semibold">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cafe/20">
              {data.datos.map((i) => (
                <tr key={i.id} className="align-top">
                  <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{fmtFechaHora(i.fecha)}</td>
                  <td className="py-2 pr-3">
                    {i.detalles.map((d) => (
                      <span key={d.productoId} className="mr-3 inline-block whitespace-nowrap">
                        <strong>{d.codigo}</strong> ×{d.cantidad}
                      </span>
                    ))}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{i.totalUnidades}</td>
                  <td className="py-2 pr-3">{i.usuario}</td>
                  <td className="py-2 text-cafe">{i.nota ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
