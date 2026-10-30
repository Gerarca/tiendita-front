'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Cargando, MensajeError } from '@/components/Estados';
import { TarjetaProducto } from '@/components/TarjetaProducto';
import { useTasaVigente } from '@/components/TasaDelDia';
import { api } from '@/lib/api';
import type { Categoria, Pagina, Producto } from '@/lib/tipos';

/** Espera a que se deje de escribir antes de buscar. */
function useRetardado<T>(valor: T, ms = 300) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

export default function PaginaInventario() {
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [texto, setTexto] = useState('');
  const buscar = useRetardado(texto.trim());
  const { data: tasa } = useTasaVigente();

  const categorias = useQuery({
    queryKey: ['categorias'],
    queryFn: () => api<Categoria[]>('/categorias'),
  });

  // Por defecto, la primera categoría del menú (como en el boceto: ALIMENTOS)
  const categoriaId = seleccion ?? categorias.data?.[0]?.id ?? null;
  const categoria = categorias.data?.find((c) => c.id === categoriaId);

  const productos = useQuery({
    queryKey: ['productos', buscar ? { buscar } : { categoriaId }],
    queryFn: () => {
      const q = new URLSearchParams({ porPagina: '200' });
      if (buscar) q.set('buscar', buscar);
      else if (categoriaId) q.set('categoriaId', String(categoriaId));
      return api<Pagina<Producto>>(`/productos?${q}`);
    },
    enabled: Boolean(buscar) || categoriaId !== null,
  });

  /** Secciones: una por subcategoría (PASTA, SALSAS...) en el orden del menú. */
  const secciones = useMemo(() => {
    const lista = productos.data?.datos ?? [];
    if (buscar || !categoria) return [{ id: 0, titulo: null as string | null, productos: lista }];
    const hijas = categoria.hijas ?? [];
    if (hijas.length === 0) return [{ id: categoria.id, titulo: null, productos: lista }];
    return hijas
      .map((h) => ({ id: h.id, titulo: h.nombre, productos: lista.filter((p) => p.categoria.id === h.id) }))
      .filter((s) => s.productos.length > 0);
  }, [productos.data, categoria, buscar]);

  if (categorias.isLoading) return <Cargando />;
  if (categorias.error) return <MensajeError error={categorias.error} alReintentar={() => categorias.refetch()} />;

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      {/* ---------- Menú de categorías ---------- */}
      <nav aria-label="Categorías" className="md:w-48 md:shrink-0 md:border-r-2 md:border-cafe md:pr-4">
        <ul className="flex gap-2 overflow-x-auto md:flex-col md:gap-0">
          {categorias.data?.map((c) => {
            const activa = !buscar && c.id === categoriaId;
            return (
              <li key={c.id} className="md:border-b md:border-cafe/60">
                <button
                  onClick={() => {
                    setSeleccion(c.id);
                    setTexto('');
                  }}
                  aria-current={activa ? 'true' : undefined}
                  className={`w-full whitespace-nowrap rounded px-3 py-2 text-center font-mano text-xl uppercase leading-tight md:whitespace-normal ${
                    activa ? 'bg-durazno-claro text-tinta' : 'text-tinta/80 hover:bg-durazno-claro/60'
                  }`}
                >
                  {c.nombre}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ---------- Productos ---------- */}
      <section className="min-w-0 flex-1">
        <div className="mb-4 flex justify-center md:justify-start md:pl-[30%]">
          <label className="flex w-full max-w-xs items-center gap-2 border-b-2 border-cafe pb-1">
            <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 fill-cafe">
              <path d="M8.5 2a6.5 6.5 0 0 1 5.2 10.4l4 4-1.3 1.3-4-4A6.5 6.5 0 1 1 8.5 2Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
            </svg>
            <span className="sr-only">Buscar producto</span>
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por código o nombre"
              className="w-full bg-transparent text-sm outline-none placeholder:text-tinta/50"
            />
          </label>
        </div>

        {buscar && (
          <p className="mb-4 text-sm text-cafe-oscuro">
            {productos.data ? `${productos.data.total} resultado(s) para “${buscar}”` : `Buscando “${buscar}”…`}
          </p>
        )}

        {productos.isLoading && <Cargando />}
        {productos.error && <MensajeError error={productos.error} alReintentar={() => productos.refetch()} />}

        {productos.data && productos.data.datos.length === 0 && (
          <p className="py-12 text-center text-cafe">
            {buscar
              ? 'Ningún producto coincide. Prueba con otra parte del nombre o del código.'
              : 'Esta categoría todavía no tiene productos. Cárgalos desde Ingreso de material.'}
          </p>
        )}

        {productos.data &&
          secciones.map((s) => (
            <section key={s.id} className="mb-8">
              {s.titulo && <h2 className="mb-4 font-mano text-3xl uppercase tracking-wide text-cafe">{s.titulo}</h2>}
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
                {s.productos.map((p) => (
                  <TarjetaProducto key={p.id} producto={p} tasa={tasa?.bsPorUsd} />
                ))}
              </div>
            </section>
          ))}
      </section>
    </div>
  );
}
