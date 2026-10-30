'use client';

import { fmtUsd, valorUsd } from '@/lib/formato';
import type { Producto } from '@/lib/tipos';

export interface LineaRegalo {
  producto: Producto;
  cantidad: number;
}

/** Productos que salen como regalo. El valor es referencial (precio de venta actual). */
export function TablaRegalo({
  lineas,
  alCambiarCantidad,
  alQuitar,
}: {
  lineas: LineaRegalo[];
  alCambiarCantidad: (productoId: number, cantidad: number) => void;
  alQuitar: (productoId: number) => void;
}) {
  const cabecera = 'border-b-2 border-cafe px-2 py-1.5 font-mano text-lg uppercase text-cafe-oscuro';
  const total = valorUsd(lineas.map((l) => ({ precioUsd: l.producto.precioUsd, cantidad: l.cantidad })));

  return (
    <div className="mt-4 rounded border-2 border-cafe">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={`${cabecera} w-24 text-right`}>Existencia</th>
            <th className={`${cabecera} w-28 text-left`}>Cod</th>
            <th className={`${cabecera} text-left`}>Producto</th>
            <th className={`${cabecera} w-24 text-right`}>Cant</th>
            <th className={`${cabecera} w-32 text-right`}>Valor unit.</th>
            <th className={`${cabecera} w-32 text-right`}>Valor total</th>
            <th className={`${cabecera} w-10`}><span className="sr-only">Quitar</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cafe/20">
          {lineas.length === 0 && (
            <tr>
              <td colSpan={7} className="py-8 text-center text-cafe">
                Escribe un código arriba y presiona Enter para agregar lo que se regala.
              </td>
            </tr>
          )}
          {lineas.map(({ producto, cantidad }) => {
            const falta = cantidad > producto.stock;
            return (
              <tr key={producto.id} className={falta ? 'bg-ladrillo/10' : ''}>
                <td className={`px-2 py-1.5 text-right tabular-nums ${falta ? 'font-bold text-ladrillo' : ''}`}>{producto.stock}</td>
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
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtUsd(producto.precioUsd)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtUsd(valorUsd([{ precioUsd: producto.precioUsd, cantidad }]))}</td>
                <td className="px-2 py-1.5 text-center">
                  <button onClick={() => alQuitar(producto.id)} aria-label={`Quitar ${producto.nombre}`} className="rounded px-1.5 text-lg leading-none text-ladrillo hover:bg-ladrillo/10">
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        {lineas.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-cafe font-bold">
              <td colSpan={5} className="px-2 py-1.5 text-right font-mano text-lg uppercase text-cafe-oscuro">
                Valor del regalo:
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">{fmtUsd(total)}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
