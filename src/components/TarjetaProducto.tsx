import { urlImagen } from '@/lib/api';
import { aproxBs, fmtUsd } from '@/lib/formato';
import type { Producto } from '@/lib/tipos';

/** Tarjeta como en el boceto: código, foto, nombre, cantidad y precio. */
export function TarjetaProducto({ producto, tasa }: { producto: Producto; tasa?: string }) {
  const imagen = urlImagen(producto.imagenUrl);
  return (
    <article className="flex flex-col items-center text-center">
      <p className="text-sm">
        <span className="font-bold">COD:</span> {producto.codigo}
      </p>

      <div className="mt-1 flex aspect-[4/3] w-full max-w-[11rem] items-center justify-center overflow-hidden">
        {imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagen} alt={producto.nombre} loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <span aria-hidden className="font-mano text-3xl text-cafe/60">
            {producto.codigo.split('-')[0]}
          </span>
        )}
      </div>

      <h3 className="mt-2 text-sm font-extrabold uppercase leading-tight">{producto.nombre}</h3>

      <p className="mt-1 flex flex-wrap justify-center gap-x-3 text-sm tabular-nums">
        <span className={`whitespace-nowrap ${producto.stockBajo ? 'text-ladrillo' : ''}`}>
          <span className="font-bold">CANT:</span> {producto.stock}
        </span>
        <span className="whitespace-nowrap">
          <span className="font-bold">PRECIO:</span> {fmtUsd(producto.precioUsd)}
        </span>
      </p>
      {tasa && <p className="text-xs tabular-nums text-cafe">{aproxBs(producto.precioUsd, tasa)}</p>}
      {producto.stockBajo && <p className="text-xs font-semibold text-ladrillo">Stock bajo</p>}
    </article>
  );
}
