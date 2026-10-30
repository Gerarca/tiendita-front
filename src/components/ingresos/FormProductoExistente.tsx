'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { BotonesFormulario, Campo } from '@/components/Campo';
import { api, ErrorApi } from '@/lib/api';
import { fmtUsd, hoyVenezuela, leerEntero, leerMonto } from '@/lib/formato';
import type { Ingreso, Pagina, Producto } from '@/lib/tipos';

/** Boceto "EXISTENTE": suma unidades a un producto y, si es admin, permite cambiar su precio. */
export function FormProductoExistente({
  categoriaId,
  nombreCategoria,
  esAdmin,
  alCancelar,
  alTerminar,
}: {
  categoriaId: number;
  nombreCategoria: string;
  esAdmin: boolean;
  alCancelar: () => void;
  alTerminar: (mensaje: string) => void;
}) {
  const clienteQuery = useQueryClient();
  const [texto, setTexto] = useState('');
  const [buscar, setBuscar] = useState('');
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [editarPrecio, setEditarPrecio] = useState(false);
  const [precio, setPrecio] = useState('');
  const [costo, setCosto] = useState('');
  const [nota, setNota] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  /** Al editar un campo, su mensaje de error desaparece. */
  const limpiar = (campo: string) => setErrores((e) => (e[campo] ? { ...e, [campo]: '' } : e));

  useEffect(() => {
    const t = setTimeout(() => setBuscar(texto.trim()), 250);
    return () => clearTimeout(t);
  }, [texto]);

  const resultados = useQuery({
    queryKey: ['productos', { categoriaId, buscar, para: 'ingreso' }],
    queryFn: () => {
      const q = new URLSearchParams({ categoriaId: String(categoriaId), porPagina: '50' });
      if (buscar) q.set('buscar', buscar);
      return api<Pagina<Producto>>(`/productos?${q}`);
    },
    enabled: producto === null,
  });

  function elegir(p: Producto) {
    setProducto(p);
    setPrecio(p.precioUsd.replace('.', ','));
    setEditarPrecio(false);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!producto) return;
    setErrorGeneral(null);

    const nuevos: Record<string, string> = {};
    const cant = leerEntero(cantidad);
    if (cant === null) nuevos.cantidad = 'Cantidad entera mayor que cero';
    const nuevoPrecio = editarPrecio ? leerMonto(precio) : undefined;
    if (nuevoPrecio === null) nuevos.precio = 'Precio en $ con máximo 2 decimales';
    const cost = costo.trim() ? leerMonto(costo) : undefined;
    if (cost === null) nuevos.costo = 'Costo inválido';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    const cambiaPrecio = nuevoPrecio !== undefined && nuevoPrecio !== Number(producto.precioUsd);

    setEnviando(true);
    try {
      await api<Ingreso>('/ingresos', {
        method: 'POST',
        json: {
          detalles: [
            {
              productoId: producto.id,
              cantidad: cant,
              ...(cost !== undefined ? { costoUnitUsd: cost } : {}),
              ...(cambiaPrecio ? { nuevoPrecioUsd: nuevoPrecio } : {}),
            },
          ],
          ...(nota.trim() ? { nota: nota.trim() } : {}),
        },
      });
      await Promise.all([
        clienteQuery.invalidateQueries({ queryKey: ['productos'] }),
        clienteQuery.invalidateQueries({ queryKey: ['ingresos'] }),
      ]);
      alTerminar(
        `Ingresaron ${cant} unidad(es) de ${producto.codigo} ${producto.nombre}. Stock actual: ${producto.stock + cant!}.` +
          (cambiaPrecio ? ` Precio actualizado a ${fmtUsd(nuevoPrecio!)}.` : ''),
      );
    } catch (err) {
      setErrorGeneral(err instanceof ErrorApi ? err.message : 'No se pudo registrar el ingreso');
    } finally {
      setEnviando(false);
    }
  }

  // ---------- Paso 1: elegir el producto ----------
  if (!producto) {
    const lista = resultados.data?.datos ?? [];
    return (
      <div>
        <p className="mb-3 text-sm text-cafe">
          Busca el producto en <strong className="text-cafe-oscuro">{nombreCategoria}</strong> por código o nombre.
        </p>
        <input
          type="search"
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej. PST-HUE o pasta"
          aria-label="Buscar producto"
          className="mb-3 w-full border-b-2 border-cafe/40 px-1 py-1 outline-none focus:border-cafe"
        />
        {resultados.isLoading && <p className="py-4 text-center text-cafe">Buscando…</p>}
        {resultados.error && <p className="text-sm text-ladrillo">{(resultados.error as Error).message}</p>}
        {resultados.data && lista.length === 0 && (
          <p className="py-4 text-center text-sm text-cafe">
            {buscar ? 'Ningún producto coincide.' : 'Esta categoría no tiene productos todavía. Créalo con "Producto nuevo".'}
          </p>
        )}
        <ul className="max-h-72 divide-y divide-cafe/20 overflow-y-auto">
          {lista.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => elegir(p)} className="flex w-full items-baseline justify-between gap-3 px-2 py-2 text-left hover:bg-durazno-claro">
                <span>
                  <span className="font-bold">{p.codigo}</span> <span className="uppercase">{p.nombre}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-cafe">
                  Stock {p.stock}, {fmtUsd(p.precioUsd)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <button type="button" onClick={alCancelar} className="rounded border-2 border-cafe/60 px-4 py-1.5 font-mano text-xl uppercase text-cafe-oscuro hover:bg-durazno-claro">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ---------- Paso 2: cantidad (y precio) ----------
  return (
    <form onSubmit={guardar} noValidate>
      <div className="mb-3 grid grid-cols-[7.5rem_1fr] items-center gap-2">
        <span className="font-mano text-xl uppercase text-cafe-oscuro">Cod:</span>
        <span className="flex items-center justify-between gap-2">
          <strong>{producto.codigo}</strong>
          <button type="button" onClick={() => setProducto(null)} className="text-xs text-cafe underline">
            Cambiar producto
          </button>
        </span>
      </div>
      <div className="mb-3 grid grid-cols-[7.5rem_1fr] items-center gap-2">
        <span className="font-mano text-xl uppercase text-cafe-oscuro">Nombre:</span>
        <span className="uppercase">{producto.nombre}</span>
      </div>
      <div className="mb-3 grid grid-cols-[7.5rem_1fr] items-center gap-2">
        <span className="font-mano text-xl uppercase text-cafe-oscuro">En tienda:</span>
        <span className="tabular-nums">{producto.stock} unidad(es)</span>
      </div>

      <Campo etiqueta="Cantidad" name="cantidad" inputMode="numeric" autoFocus value={cantidad} onChange={(e) => { setCantidad(e.target.value); limpiar('cantidad'); }} error={errores.cantidad} ayuda="Unidades que entran" />

      <div className="mb-3 grid grid-cols-[7.5rem_1fr] items-center gap-2">
        <span className="font-mano text-xl uppercase text-cafe-oscuro">Precio:</span>
        {editarPrecio ? (
          <span>
            <input
              name="precio"
              inputMode="decimal"
              value={precio}
              onChange={(e) => { setPrecio(e.target.value); limpiar('precio'); }}
              aria-label="Nuevo precio en dólares"
              aria-invalid={errores.precio ? true : undefined}
              className={`w-28 border-b-2 bg-transparent px-1 py-1 outline-none focus:border-cafe ${errores.precio ? 'border-ladrillo' : 'border-cafe/40'}`}
            />{' '}
            $<span className="ml-3 text-xs text-cafe">Fecha de edición: {hoyVenezuela()}</span>
          </span>
        ) : (
          <span className="flex items-center gap-3">
            <span className="tabular-nums">{fmtUsd(producto.precioUsd)}</span>
            {esAdmin && (
              <button type="button" onClick={() => setEditarPrecio(true)} className="text-sm text-cafe underline">
                Editar precio
              </button>
            )}
          </span>
        )}
      </div>
      {errores.precio && <p className="-mt-2 mb-3 pl-[8rem] text-xs text-ladrillo">{errores.precio}</p>}

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-cafe">Más datos (opcional)</summary>
        <div className="mt-3">
          <Campo etiqueta="Costo" name="costo" inputMode="decimal" value={costo} onChange={(e) => { setCosto(e.target.value); limpiar('costo'); }} error={errores.costo} ayuda="Costo por unidad en $" />
          <Campo etiqueta="Nota" name="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Producción de esta semana" />
        </div>
      </details>

      {errorGeneral && <p role="alert" className="mt-4 text-sm text-ladrillo">{errorGeneral}</p>}
      <BotonesFormulario alCancelar={alCancelar} enviando={enviando} />
    </form>
  );
}
