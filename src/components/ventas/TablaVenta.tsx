'use client';

import { fmtBs, fmtUsd } from '@/lib/formato';
import type { LineaCotizada, Producto } from '@/lib/tipos';

export interface LineaVenta {
  producto: Producto;
  cantidad: number;
}

/** Tabla del boceto: EXISTENCIA | COD | PRODUCTO | CANT | PRECIO | TOTAL. */
export function TablaVenta({
  lineas,
  cotizadas,
  alCambiarCantidad,
  alQuitar,
}: {
  lineas: LineaVenta[];
  cotizadas: LineaCotizada[] | undefined;
  alCambiarCantidad: (productoId: number, cantidad: number) => void;
  alQuitar: (productoId: number) => void;
}) {
  const porId = new Map(cotizadas?.map((l) => [l.productoId, l]));
  const cabecera = 'border-b-2 border-cafe px-2 py-1.5 font-mano text-lg uppercase text-cafe-oscuro';

  return (
    <div className="mt-4 max-h-80 overflow-y-auto rounded border-2 border-cafe">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white">
          <tr>
            <th className={`${cabecera} w-24 text-right`}>Existencia</th>
            <th className={`${cabecera} w-28 text-left`}>Cod</th>
            <th className={`${cabecera} text-left`}>Producto</th>
            <th className={`${cabecera} w-24 text-right`}>Cant</th>
            <th className={`${cabecera} w-28 text-right`}>Precio</th>
            <th className={`${cabecera} w-28 text-right`}>Total $</th>
            <th className={`${cabecera} w-36 text-right`}>Total Bs</th>
            <th className={`${cabecera} w-10`}><span className="sr-only">Quitar</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cafe/20">
          {lineas.length === 0 && (
            <tr>
              <td colSpan={8} className="py-10 text-center text-cafe">
                Escribe un código arriba y presiona Enter para agregar productos.
              </td>
            </tr>
          )}
          {lineas.map(({ producto, cantidad }) => {
            const c = porId.get(producto.id);
            const existencia = c?.stockDisponible ?? producto.stock;
            const falta = cantidad > existencia;
            return (
              <tr key={producto.id} className={falta ? 'bg-ladrillo/10' : ''}>
                <td className={`px-2 py-1.5 text-right tabular-nums ${falta ? 'font-bold text-ladrillo' : ''}`}>{existencia}</td>
                <td className="px-2 py-1.5 font-semibold">{producto.codigo}</td>
                <td className="px-2 py-1.5 uppercase">
                  {producto.nombre}
                  {falta && <span className="ml-2 text-xs normal-case text-ladrillo">no hay suficiente</span>}
                </td>
                <td className="px-2 py-1 text-right">
                  <input
                    type="number"
                    min={1}
                    value={cantidad}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isInteger(n) && n >= 1) alCambiarCantidad(producto.id, n);
                    }}
                    aria-label={`Cantidad de ${producto.nombre}`}
                    className="w-16 rounded border border-cafe/40 px-1 py-0.5 text-right tabular-nums"
                  />
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtUsd(c?.precioUnitUsd ?? producto.precioUsd)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{c ? fmtUsd(c.subtotalUsd) : '…'}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{c ? fmtBs(c.subtotalBs) : '…'}</td>
                <td className="px-2 py-1.5 text-center">
                  <button onClick={() => alQuitar(producto.id)} aria-label={`Quitar ${producto.nombre}`} className="rounded px-1.5 text-lg leading-none text-ladrillo hover:bg-ladrillo/10">
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
