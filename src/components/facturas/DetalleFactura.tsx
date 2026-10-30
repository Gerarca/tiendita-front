'use client';

import { useQuery } from '@tanstack/react-query';
import { Cargando, MensajeError } from '@/components/Estados';
import { api } from '@/lib/api';
import { fmtBs, fmtFechaHora, fmtUsd, NOMBRE_METODO } from '@/lib/formato';
import type { VentaDetalle } from '@/lib/tipos';
import { BotonFactura } from './BotonFactura';

const dato = 'grid grid-cols-[7rem_1fr] gap-2';
const etiqueta = 'font-semibold text-cafe-oscuro';

export function DetalleFactura({ ventaId }: { ventaId: number }) {
  const { data: v, error, isLoading, refetch } = useQuery({
    queryKey: ['ventas', 'detalle', ventaId],
    queryFn: () => api<VentaDetalle>(`/ventas/${ventaId}`),
  });

  if (isLoading) return <Cargando />;
  if (error || !v) return <MensajeError error={error} alReintentar={() => refetch()} />;

  const cabecera = 'border-b-2 border-cafe px-2 py-1 text-left font-semibold text-cafe-oscuro';

  return (
    <div className="text-sm">
      {v.anulacion && (
        <p role="status" className="mb-4 rounded border-l-4 border-ladrillo bg-ladrillo/10 px-3 py-2 text-ladrillo">
          <strong>Venta anulada</strong> el {v.anulacion.en ? fmtFechaHora(v.anulacion.en) : ''} por {v.anulacion.por}. Motivo:{' '}
          {v.anulacion.motivo}
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-8 gap-y-1">
        <p className={dato}><span className={etiqueta}>Venta N°</span><strong className="tabular-nums">{v.numeroControl}</strong></p>
        <p className={dato}><span className={etiqueta}>Fecha</span><span className="tabular-nums">{fmtFechaHora(v.fecha)}</span></p>
        <p className={dato}><span className={etiqueta}>Cliente</span>{v.cliente.nombre}</p>
        <p className={dato}><span className={etiqueta}>CI / RIF</span>{v.cliente.documento ?? '—'}</p>
        <p className={dato}><span className={etiqueta}>Teléfono</span>{v.cliente.telefono ?? '—'}</p>
        <p className={dato}><span className={etiqueta}>Dirección</span>{[v.cliente.direccion, v.cliente.ciudad, v.cliente.estado].filter(Boolean).join(', ') || '—'}</p>
        <p className={dato}><span className={etiqueta}>Atendió</span>{v.vendedor}</p>
        <p className={dato}><span className={etiqueta}>Dólar del día</span><span className="tabular-nums">{fmtBs(v.tasa)}</span></p>
      </div>

      <table className="mt-4 w-full">
        <thead>
          <tr>
            <th className={cabecera}>Código</th>
            <th className={cabecera}>Producto</th>
            <th className={`${cabecera} text-right`}>Cant.</th>
            <th className={`${cabecera} text-right`}>Precio</th>
            <th className={`${cabecera} text-right`}>Total $</th>
            <th className={`${cabecera} text-right`}>Total Bs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cafe/20">
          {v.detalles.map((d) => (
            <tr key={d.productoId}>
              <td className="px-2 py-1 font-semibold">{d.codigo}</td>
              <td className="px-2 py-1">{d.nombre}</td>
              <td className="px-2 py-1 text-right tabular-nums">{d.cantidad}</td>
              <td className="px-2 py-1 text-right tabular-nums">{fmtUsd(d.precioUnitUsd)}</td>
              <td className="px-2 py-1 text-right tabular-nums">{fmtUsd(d.subtotalUsd)}</td>
              <td className="px-2 py-1 text-right tabular-nums">{fmtBs(d.subtotalBs)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-cafe font-bold">
            <td colSpan={4} className="px-2 py-1 text-right">Total</td>
            <td className="px-2 py-1 text-right tabular-nums">{fmtUsd(v.totalUsd)}</td>
            <td className="px-2 py-1 text-right tabular-nums">{fmtBs(v.totalBs)}</td>
          </tr>
        </tfoot>
      </table>

      <h3 className="mt-5 font-semibold text-cafe-oscuro">Pagos ({NOMBRE_METODO[v.formaPago]})</h3>
      <ul className="mt-1 divide-y divide-cafe/20">
        {v.pagos.map((p, i) => (
          <li key={i} className="flex justify-between gap-4 py-1">
            <span>
              {NOMBRE_METODO[p.metodo]}
              {p.cuenta && <span className="text-cafe">, {p.cuenta.nombre}</span>}
              {p.referencia && <span className="text-cafe">, ref. {p.referencia}</span>}
            </span>
            <span className="tabular-nums">
              {p.moneda === 'USD' ? fmtUsd(p.monto) : fmtBs(p.monto)}
              {p.moneda === 'USD' && <span className="text-cafe"> ({fmtBs(p.montoBs)})</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-right">
        Cobrado: <strong className="tabular-nums">{fmtBs(v.pagadoBs)}</strong> (<span className="tabular-nums">{fmtUsd(v.pagadoUsd)}</span>)
        {Number(v.diferenciaBs) > 0 && <span className="text-cafe">, pagado de más {fmtBs(v.diferenciaBs)}</span>}
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <BotonFactura
          ventaId={v.id}
          numeroControl={v.numeroControl}
          modo="descargar"
          texto="Descargar PDF"
          className="rounded border-2 border-cafe-oscuro px-5 py-2 font-mano text-xl uppercase text-cafe-oscuro hover:bg-durazno-claro disabled:opacity-60"
        />
        <BotonFactura
          ventaId={v.id}
          numeroControl={v.numeroControl}
          texto="Imprimir"
          className="rounded bg-cafe-oscuro px-5 py-2 font-mano text-xl uppercase text-white hover:bg-cafe disabled:opacity-60"
        />
      </div>
    </div>
  );
}
