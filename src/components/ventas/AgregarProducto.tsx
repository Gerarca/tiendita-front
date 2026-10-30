'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, type KeyboardEvent, type RefObject } from 'react';
import { api, ErrorApi } from '@/lib/api';
import { fmtUsd, leerEntero } from '@/lib/formato';
import { useRetardado } from '@/lib/hooks';
import type { Pagina, Producto } from '@/lib/tipos';

const etiqueta = 'font-mano text-xl uppercase text-cafe-oscuro';

/**
 * COD + CANT del boceto. Flujo de caja: escribir código → Enter → cantidad → Enter.
 * Mientras se escribe aparecen sugerencias (↑ ↓ para elegir).
 */
export function AgregarProducto({
  alAgregar,
  refCodigo,
}: {
  alAgregar: (p: Producto, cantidad: number) => void;
  refCodigo: RefObject<HTMLInputElement | null>;
}) {
  const [codigo, setCodigo] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [producto, setProducto] = useState<Producto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  const [mostrar, setMostrar] = useState(false);
  const buscar = useRetardado(codigo.trim(), 200);

  const sugerencias = useQuery({
    queryKey: ['productos', { buscar, para: 'venta' }],
    queryFn: () => api<Pagina<Producto>>(`/productos?${new URLSearchParams({ buscar, porPagina: '8' })}`),
    enabled: mostrar && !producto && buscar.length >= 2,
  });
  const lista = mostrar && !producto ? (sugerencias.data?.datos ?? []) : [];

  function elegir(p: Producto) {
    setProducto(p);
    setCodigo(p.codigo);
    setMostrar(false);
    setError(null);
    setCantidad('1');
    requestAnimationFrame(() => document.getElementById('venta-cant')?.focus());
  }

  async function resolverCodigo() {
    if (lista[indice]) return elegir(lista[indice]);
    const c = codigo.trim();
    if (!c) return;
    try {
      elegir(await api<Producto>(`/productos/codigo/${encodeURIComponent(c)}`));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo buscar el producto');
    }
  }

  function teclaCodigo(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndice((i) => Math.min(i + 1, lista.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndice((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      resolverCodigo();
    } else if (e.key === 'Escape') {
      setMostrar(false);
    }
  }

  function agregar() {
    if (!producto) return;
    const n = leerEntero(cantidad);
    if (n === null) {
      setError('La cantidad debe ser un número entero mayor que cero');
      return;
    }
    alAgregar(producto, n);
    setProducto(null);
    setCodigo('');
    setCantidad('1');
    setError(null);
    refCodigo.current?.focus();
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="flex items-center gap-2">
          <span className={etiqueta}>Cod:</span>
          <input
            ref={refCodigo}
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value);
              setProducto(null);
              setMostrar(true);
              setIndice(0);
              setError(null);
            }}
            onKeyDown={teclaCodigo}
            onBlur={() => setTimeout(() => setMostrar(false), 150)}
            placeholder="Código o nombre"
            className="w-48 border-b-2 border-cafe/40 bg-transparent px-1 py-0.5 uppercase outline-none focus:border-cafe"
            autoComplete="off"
            role="combobox"
            aria-expanded={lista.length > 0}
            aria-controls="venta-sugerencias"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className={etiqueta}>Cant:</span>
          <input
            id="venta-cant"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregar())}
            inputMode="numeric"
            className="w-16 border-b-2 border-cafe/40 bg-transparent px-1 py-0.5 text-right outline-none focus:border-cafe"
          />
        </label>
        <button
          type="button"
          onClick={agregar}
          disabled={!producto}
          className="rounded border-2 border-cafe-oscuro px-3 py-0.5 font-mano text-lg uppercase text-cafe-oscuro hover:bg-durazno-claro disabled:opacity-40"
        >
          Agregar
        </button>
        {producto && (
          <span className="text-sm">
            <strong className="uppercase">{producto.nombre}</strong>{' '}
            <span className="text-cafe">
              {fmtUsd(producto.precioUsd)}, en tienda {producto.stock}
            </span>
          </span>
        )}
      </div>

      {error && <p role="alert" className="mt-1 text-sm text-ladrillo">{error}</p>}

      {lista.length > 0 && (
        <ul id="venta-sugerencias" role="listbox" className="absolute left-14 top-9 z-10 w-[30rem] rounded border-2 border-cafe bg-white py-1 shadow-lg">
          {lista.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === indice}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(p)}
                className={`flex w-full justify-between gap-3 px-3 py-1.5 text-left text-sm ${i === indice ? 'bg-durazno-claro' : 'hover:bg-durazno-claro/60'}`}
              >
                <span>
                  <strong>{p.codigo}</strong> <span className="uppercase">{p.nombre}</span>
                </span>
                <span className="shrink-0 tabular-nums text-cafe">
                  {fmtUsd(p.precioUsd)}, stock {p.stock}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
