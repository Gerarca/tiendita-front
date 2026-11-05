'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { BotonesFormulario, Campo } from '@/components/Campo';
import { api, ErrorApi } from '@/lib/api';
import { alEnter, FLUJO_PRODUCTO as O } from '@/lib/flujo';
import { leerEntero, leerMonto } from '@/lib/formato';
import type { Categoria, Ingreso, Producto, VozFiscal } from '@/lib/tipos';
import { SelectorImagen } from './SelectorImagen';

/** Boceto "NUEVO": crea el producto con su primer ingreso y, si hay, su imagen. */
export function FormProductoNuevo({
  categoria,
  alCancelar,
  alTerminar,
}: {
  categoria: Categoria;
  alCancelar: () => void;
  alTerminar: (mensaje: string) => void;
}) {
  const clienteQuery = useQueryClient();
  const [codigo, setCodigo] = useState(categoria.prefijoCodigo ? `${categoria.prefijoCodigo}-` : '');
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [costo, setCosto] = useState('');
  const [nota, setNota] = useState('');
  const [vozFiscalId, setVozFiscalId] = useState<number | ''>('');
  const [imagen, setImagen] = useState<File | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const voces = useQuery({ queryKey: ['voces-fiscales'], queryFn: () => api<VozFiscal[]>('/voces-fiscales') });
  const vozCategoria = voces.data?.find((v) => v.id === categoria.vozFiscalId);

  /** Al editar un campo, su mensaje de error desaparece. */
  const limpiar = (campo: string) => setErrores((e) => (e[campo] ? { ...e, [campo]: '' } : e));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);

    const nuevos: Record<string, string> = {};
    const codigoLimpio = codigo.trim().toUpperCase();
    if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(codigoLimpio)) nuevos.codigo = 'Solo letras, números y guiones (ej. PST-HUE)';
    if (!nombre.trim()) nuevos.nombre = 'Escribe el nombre del producto';
    const cant = leerEntero(cantidad);
    if (cant === null) nuevos.cantidad = 'Cantidad entera mayor que cero';
    const prec = leerMonto(precio);
    if (prec === null) nuevos.precio = 'Precio en $ con máximo 2 decimales (ej. 2,80)';
    const cost = costo.trim() ? leerMonto(costo) : undefined;
    if (cost === null) nuevos.costo = 'Costo inválido';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setEnviando(true);
    try {
      const r = await api<{ producto: Producto; ingreso: Ingreso }>('/ingresos/producto-nuevo', {
        method: 'POST',
        json: {
          producto: {
            codigo: codigoLimpio,
            nombre: nombre.trim(),
            categoriaId: categoria.id,
            precioUsd: prec,
            ...(vozFiscalId ? { vozFiscalId } : {}),
          },
          cantidad: cant,
          ...(cost !== undefined ? { costoUnitUsd: cost } : {}),
          ...(nota.trim() ? { nota: nota.trim() } : {}),
        },
      });

      let avisoImagen = '';
      if (imagen) {
        const datos = new FormData();
        datos.append('imagen', imagen);
        try {
          await api(`/productos/${r.producto.id}/imagen`, { method: 'POST', body: datos });
        } catch (err) {
          avisoImagen = ` La imagen no se pudo subir (${err instanceof ErrorApi ? err.message : 'error'}); puedes intentarlo de nuevo más tarde.`;
        }
      }

      await Promise.all([
        clienteQuery.invalidateQueries({ queryKey: ['productos'] }),
        clienteQuery.invalidateQueries({ queryKey: ['ingresos'] }),
        clienteQuery.invalidateQueries({ queryKey: ['categorias'] }),
      ]);
      alTerminar(`Se creó ${r.producto.codigo} ${r.producto.nombre} con ${cant} unidad(es).${avisoImagen}`);
    } catch (err) {
      setErrorGeneral(err instanceof ErrorApi ? err.message : 'No se pudo guardar el producto');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate>
      <p className="mb-4 text-sm text-cafe">
        Categoría: <strong className="text-cafe-oscuro">{categoria.nombre}</strong>
      </p>

      <Campo etiqueta="Cod" name="codigo" value={codigo} onChange={(e) => { setCodigo(e.target.value); limpiar('codigo'); }} error={errores.codigo} autoFocus autoComplete="off" className="uppercase" onKeyDown={alEnter} data-flujo={O.codigo} />
      <Campo etiqueta="Nombre" name="nombre" value={nombre} onChange={(e) => { setNombre(e.target.value); limpiar('nombre'); }} error={errores.nombre} autoComplete="off" onKeyDown={alEnter} data-flujo={O.nombre} />
      <Campo etiqueta="Cantidad" name="cantidad" inputMode="numeric" value={cantidad} onChange={(e) => { setCantidad(e.target.value); limpiar('cantidad'); }} error={errores.cantidad} onKeyDown={alEnter} data-flujo={O.cantidad} />
      <Campo etiqueta="Precio" name="precio" inputMode="decimal" value={precio} onChange={(e) => { setPrecio(e.target.value); limpiar('precio'); }} error={errores.precio} ayuda="En dólares, ej. 2,80" onKeyDown={alEnter} data-flujo={O.precio} />

      <SelectorImagen archivo={imagen} alCambiar={setImagen} />

      <div className="mb-3 grid grid-cols-[7.5rem_1fr] items-center gap-2">
        <label htmlFor="voz" className="font-mano text-xl uppercase text-cafe-oscuro">
          Voz fiscal:
        </label>
        <div>
          <select
            id="voz"
            value={vozFiscalId}
            onChange={(e) => setVozFiscalId(e.target.value ? Number(e.target.value) : '')}
            onKeyDown={alEnter}
            data-flujo={O.voz}
            className="w-full border-b-2 border-cafe/40 bg-transparent px-1 py-1 outline-none focus:border-cafe"
          >
            <option value="">
              {vozCategoria ? `La de la categoría (${vozCategoria.nombre})` : 'La de la categoría (sin asignar)'}
            </option>
            {voces.data
              ?.filter((v) => v.activo)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre} ({v.exentoIva ? 'exento' : 'con IVA'})
                </option>
              ))}
          </select>
          <p className="mt-1 text-xs text-cafe">Departamento de la máquina fiscal; aparece en el recuadro "MÁQUINA Bs." de la factura.</p>
        </div>
      </div>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-cafe">Más datos (opcional)</summary>
        <div className="mt-3">
          <Campo etiqueta="Costo" name="costo" inputMode="decimal" value={costo} onChange={(e) => { setCosto(e.target.value); limpiar('costo'); }} error={errores.costo} ayuda="Costo por unidad en $, para calcular ganancia" onKeyDown={alEnter} data-flujo={O.costo} />
          <Campo etiqueta="Nota" name="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Inventario inicial" onKeyDown={alEnter} data-flujo={O.nota} />
        </div>
      </details>

      {errorGeneral && <p role="alert" className="mt-4 text-sm text-ladrillo">{errorGeneral}</p>}
      <BotonesFormulario alCancelar={alCancelar} enviando={enviando} />
    </form>
  );
}
