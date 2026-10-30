'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSesion } from '@/lib/sesion';

/** Imagen opcional: si el archivo no está en /public, muestra el respaldo. */
function Imagen({ src, alt, respaldo, className }: { src: string; alt: string; respaldo: React.ReactNode; className: string }) {
  const [falla, setFalla] = useState(false);
  if (falla) return <>{respaldo}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setFalla(true)} />;
}

export function Encabezado() {
  const { usuario, cerrar } = useSesion();
  return (
    <header className="mx-auto max-w-6xl px-4 pt-3">
      <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1">
        {usuario && (
          <span className="flex items-center gap-3 text-sm">
            <span className="text-cafe-oscuro">{usuario.nombre}</span>
            <button onClick={cerrar} className="rounded px-2 py-0.5 text-cafe underline-offset-2 hover:underline">
              Salir
            </button>
          </span>
        )}
      </div>
      <div className="grid grid-cols-[5.5rem_1fr_4rem] items-center py-3 md:grid-cols-[8rem_1fr_6rem]">
        <Imagen
          src="/assets/img/iglesia-silueta-solida.svg"
          alt="Monasterio Humocaro"
          className="h-14 w-auto md:h-20"
          respaldo={<span aria-hidden className="font-mano text-5xl text-cafe-oscuro">†</span>}
        />
        <h1 className="text-center font-mano text-3xl tracking-wide text-tinta md:text-5xl">TIENDA DEL MONASTERIO</h1>
        <Imagen src="/assets/img/monja.png" alt="" className="ml-auto h-14 w-auto md:h-20" respaldo={null} />
      </div>
    </header>
  );
}

const PESTANAS = [
  { href: '/inventario/', texto: 'INVENTARIO' },
  { href: '/ventas/', texto: 'VENTAS' },
  { href: '/facturas/', texto: 'FACTURAS' },
  { href: '/ingresos/', texto: 'INGRESO DE MATERIAL' },
  { href: '/traspasos/', texto: 'TRASPASO DE MATERIAL' },
  { href: '/regalos/', texto: 'REGALOS' },
];

export function Pestanas() {
  const ruta = usePathname();
  return (
    <nav aria-label="Secciones" className="mx-auto max-w-6xl px-4">
      <ul className="flex w-max min-w-full border-b-2 border-cafe bg-white px-2 pt-2">
        {PESTANAS.map((p, i) => {
          const activa = ruta?.startsWith(p.href.slice(0, -1));
          return (
            <li key={p.href} className={`relative ${i > 0 ? 'border-l-2 border-cafe/70' : ''}`}>
              <Link
                href={p.href}
                aria-current={activa ? 'page' : undefined}
                className={`block whitespace-nowrap px-4 pb-2 pt-1 font-mano text-lg tracking-wide md:text-xl ${
                  activa ? 'font-bold text-tinta' : 'text-tinta/70 hover:text-tinta'
                }`}
              >
                {p.texto}
              </Link>
              {/* Marca de la pestaña activa, como el triángulo del boceto */}
              {activa && (
                <span aria-hidden className="absolute -bottom-[2px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[7px] border-b-[7px] border-x-transparent border-b-cafe" />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
