'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Dialogo } from '@/components/Dialogo';
import { MensajeError } from '@/components/Estados';
import { BotonFactura } from '@/components/facturas/BotonFactura';
import { DetalleFactura } from '@/components/facturas/DetalleFactura';
import { api } from '@/lib/api';
import { fmtBs, fmtFechaHora, fmtUsd, hoyIso, inicioMesIso, NOMBRE_METODO } from '@/lib/formato';
import { useRetardado } from '@/lib/hooks';
import type { ListaVentas, VentaResumen } from '@/lib/tipos';

const POR_PAGINA = 25;
const etiqueta = 'text-sm font-semibold text-cafe-oscuro';
const control = 'rounded border border-cafe/50 bg-white px-2 py-1.5';

/** Historial de facturas: filtros, lista paginada, detalle y PDF. */
export default function PaginaFacturas() {
  const [desde, setDesde] = useState(inicioMesIso());
  const [hasta, setHasta] = useState(hoyIso());
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<'' | 'ACTIVA' | 'ANULADA'>('');
  const [pagina, setPagina] = useState(1);
  const [abierta, setAbierta] = useState<VentaResumen | null>(null);
  const buscar = useRetardado(texto.trim(), 300);

  const rangoValido = Boolean(desde && hasta && desde <= hasta);
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['ventas', 'historial', { desde, hasta, buscar, estado, pagina }],
    queryFn: () => {
      const q = new URLSearchParams({ desde, hasta, pagina: String(pagina), porPagina: String(POR_PAGINA) });
      if (buscar) q.set('buscar', buscar);
      if (estado) q.set('estado', estado);
      return api<ListaVentas>(`/ventas?${q}`);
    },
    enabled: rangoValido,
    placeholderData: keepPreviousData,
  });

  const paginas = data ? Math.max(1, Math.ceil(data.total / POR_PAGINA)) : 1;
  const filtro = (fn: () => void) => {
    fn();
    setPagina(1);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className={etiqueta}>Desde</span>
          <input type="date" value={desde} max={hasta} onChange={(e) => filtro(() => setDesde(e.target.value))} className={control} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={etiqueta}>Hasta</span>
          <input type="date" value={hasta} min={desde} onChange={(e) => filtro(() => setHasta(e.target.value))} className={control} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className={etiqueta}>Buscar</span>
          <input
            type="search"
            value={texto}
            onChange={(e) => filtro(() => setTexto(e.target.value))}
            placeholder="N° de venta, nombre o cédula del cliente"
            className={control}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={etiqueta}>Estado</span>
          <select value={estado} onChange={(e) => filtro(() => setEstado(e.target.value as typeof estado))} className={control}>
            <option value="">Todas</option>
            <option value="ACTIVA">Activas</option>
            <option value="ANULADA">Anuladas</option>
          </select>
        </label>
      </div>
      {!rangoValido && <p className="mt-2 text-sm text-ladrillo">Revisa las fechas: "Desde" debe ser anterior a "Hasta".</p>}

      {data && (
        <p className="mt-4 text-sm">
          {data.total} factura(s) en el período. Ventas activas: <strong>{data.resumen.ventasActivas}</strong> por{' '}
          <strong className="tabular-nums">{fmtUsd(data.resumen.totalUsd)}</strong> /{' '}
          <strong className="tabular-nums">{fmtBs(data.resumen.totalBs)}</strong>
          {isFetching && <span className="ml-2 text-cafe">actualizando…</span>}
        </p>
      )}
      {error && <MensajeError error={error} alReintentar={() => refetch()} />}

      {data && data.datos.length === 0 && <p className="py-10 text-center text-cafe">No hay facturas con esos filtros.</p>}
      {data && data.datos.length > 0 && (
        <table className="mt-3 w-full text-left text-sm">
          <thead className="border-b-2 border-cafe text-cafe-oscuro">
            <tr>
              <th className="py-2 pr-3 font-semibold">N° venta</th>
              <th className="py-2 pr-3 font-semibold">Fecha</th>
              <th className="py-2 pr-3 font-semibold">Cliente</th>
              <th className="py-2 pr-3 font-semibold">CI / RIF</th>
              <th className="py-2 pr-3 text-right font-semibold">Total $</th>
              <th className="py-2 pr-3 text-right font-semibold">Total Bs</th>
              <th className="py-2 pr-3 font-semibold">Forma de pago</th>
              <th className="py-2 pr-3 font-semibold">Estado</th>
              <th className="py-2"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe/20">
            {data.datos.map((v) => {
              const anulada = v.estado === 'ANULADA';
              return (
                <tr key={v.id} className="hover:bg-durazno-claro/40">
                  <td className={`py-2 pr-3 font-semibold tabular-nums ${anulada ? 'text-tinta/50 line-through' : ''}`}>{v.numeroControl}</td>
                  <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{fmtFechaHora(v.fecha)}</td>
                  <td className="py-2 pr-3">{v.cliente.nombre}</td>
                  <td className="py-2 pr-3 tabular-nums">{v.cliente.documento ?? '—'}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(v.totalUsd)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtBs(v.totalBs)}</td>
                  <td className="py-2 pr-3">{NOMBRE_METODO[v.formaPago]}</td>
                  <td className="py-2 pr-3">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${anulada ? 'bg-ladrillo/15 text-ladrillo' : 'bg-salvia/15 text-salvia'}`}>
                      {anulada ? 'Anulada' : 'Activa'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2 text-right">
                    <button onClick={() => setAbierta(v)} className="mr-3 text-cafe-oscuro underline">
                      Ver detalle
                    </button>
                    <span className="mr-3">
                      <BotonFactura ventaId={v.id} numeroControl={v.numeroControl} texto="Imprimir" className="text-cafe-oscuro underline" />
                    </span>
                    <BotonFactura ventaId={v.id} numeroControl={v.numeroControl} modo="descargar" texto="PDF" className="text-cafe-oscuro underline" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {data && paginas > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <button onClick={() => setPagina((p) => p - 1)} disabled={pagina <= 1} className="rounded border border-cafe/50 px-3 py-1 disabled:opacity-40">
            Anterior
          </button>
          <span>
            Página {pagina} de {paginas}
          </span>
          <button onClick={() => setPagina((p) => p + 1)} disabled={pagina >= paginas} className="rounded border border-cafe/50 px-3 py-1 disabled:opacity-40">
            Siguiente
          </button>
        </div>
      )}

      <Dialogo amplio abierto={abierta !== null} titulo={abierta ? `Factura ${abierta.numeroControl}` : ''} alCerrar={() => setAbierta(null)}>
        {abierta && <DetalleFactura ventaId={abierta.id} />}
      </Dialogo>
    </div>
  );
}
