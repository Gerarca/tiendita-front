'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Dialogo } from '@/components/Dialogo';
import { BotonFactura } from '@/components/facturas/BotonFactura';
import { MensajeError } from '@/components/Estados';
import { api, ErrorApi } from '@/lib/api';
import { fmtBs, fmtHora, fmtUsd, hoyIso, NOMBRE_METODO } from '@/lib/formato';
import type { ListaVentas, VentaResumen } from '@/lib/tipos';

export function VentasDeHoy({ esAdmin }: { esAdmin: boolean }) {
  const hoy = hoyIso();
  const clienteQuery = useQueryClient();
  const [anulando, setAnulando] = useState<VentaResumen | null>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const { data, error: errorLista, refetch } = useQuery({
    queryKey: ['ventas', 'hoy', hoy],
    queryFn: () => api<ListaVentas>(`/ventas?desde=${hoy}&hasta=${hoy}&porPagina=100`),
  });

  async function anular(e: FormEvent) {
    e.preventDefault();
    if (!anulando) return;
    setEnviando(true);
    setError(null);
    try {
      await api(`/ventas/${anulando.id}/anular`, { method: 'POST', json: { motivo: motivo.trim() } });
      await Promise.all([
        clienteQuery.invalidateQueries({ queryKey: ['ventas'] }),
        clienteQuery.invalidateQueries({ queryKey: ['productos'] }),
      ]);
      setAnulando(null);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo anular la venta');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-mano text-2xl uppercase tracking-wide text-cafe">Ventas de hoy</h2>
        {data && (
          <p className="text-sm">
            {data.resumen.ventasActivas} venta(s):{' '}
            <strong className="tabular-nums">{fmtUsd(data.resumen.totalUsd)}</strong> /{' '}
            <strong className="tabular-nums">{fmtBs(data.resumen.totalBs)}</strong>
          </p>
        )}
      </div>

      {errorLista && <MensajeError error={errorLista} alReintentar={() => refetch()} />}
      {data && data.datos.length === 0 && <p className="text-sm text-cafe">Todavía no hay ventas hoy.</p>}
      {data && data.datos.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead className="border-b-2 border-cafe text-cafe-oscuro">
            <tr>
              <th className="py-2 pr-3 font-semibold">N° control</th>
              <th className="py-2 pr-3 font-semibold">Hora</th>
              <th className="py-2 pr-3 font-semibold">Cliente</th>
              <th className="py-2 pr-3 text-right font-semibold">Unidades</th>
              <th className="py-2 pr-3 text-right font-semibold">Total $</th>
              <th className="py-2 pr-3 text-right font-semibold">Total Bs</th>
              <th className="py-2 pr-3 font-semibold">Forma de pago</th>
              <th className="py-2 pr-3 font-semibold">Vendedor</th>
              <th className="py-2"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe/20">
            {data.datos.map((v) => {
              const anulada = v.estado === 'ANULADA';
              return (
                <tr key={v.id} className={anulada ? 'text-tinta/40' : ''}>
                  <td className={`py-2 pr-3 font-semibold tabular-nums ${anulada ? 'line-through' : ''}`}>{v.numeroControl}</td>
                  <td className="py-2 pr-3 tabular-nums">{fmtHora(v.fecha)}</td>
                  <td className="py-2 pr-3">{v.cliente.nombre}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{v.unidades}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(v.totalUsd)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtBs(v.totalBs)}</td>
                  <td className="py-2 pr-3">{NOMBRE_METODO[v.formaPago]}</td>
                  <td className="py-2 pr-3">{v.vendedor}</td>
                  <td className="whitespace-nowrap py-2 text-right">
                    <BotonFactura ventaId={v.id} numeroControl={v.numeroControl} texto="Factura" className="text-xs text-cafe-oscuro underline" />
                    {esAdmin && !anulada && (
                      <button
                        onClick={() => {
                          setAnulando(v);
                          setMotivo('');
                          setError(null);
                        }}
                        className="ml-3 text-xs text-ladrillo underline"
                      >
                        Anular
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Dialogo abierto={anulando !== null} titulo="Anular venta" alCerrar={() => setAnulando(null)}>
        {anulando && (
          <form onSubmit={anular}>
            <p className="mb-4">
              Venta <strong>{anulando.numeroControl}</strong> de {anulando.cliente.nombre} por{' '}
              <strong>{fmtUsd(anulando.totalUsd)}</strong>. Los productos vuelven al inventario y la venta deja de sumar en los
              reportes, pero queda registrada como anulada.
            </p>
            <label htmlFor="motivo" className="text-sm font-semibold text-cafe-oscuro">
              Motivo
            </label>
            <input
              id="motivo"
              autoFocus
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Error al cargar la cantidad"
              className="mt-1 w-full rounded border border-cafe/50 px-2 py-1.5"
            />
            {error && <p role="alert" className="mt-2 text-sm text-ladrillo">{error}</p>}
            <div className="mt-5 flex justify-between">
              <button type="button" onClick={() => setAnulando(null)} className="rounded border-2 border-cafe/60 px-4 py-1.5 font-mano text-xl uppercase">
                Volver
              </button>
              <button type="submit" disabled={enviando || motivo.trim().length < 5} className="rounded bg-ladrillo px-4 py-1.5 font-mano text-xl uppercase text-white disabled:opacity-50">
                {enviando ? 'Anulando…' : 'Anular venta'}
              </button>
            </div>
          </form>
        )}
      </Dialogo>
    </section>
  );
}
