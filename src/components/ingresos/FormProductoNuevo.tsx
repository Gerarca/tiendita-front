'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { BotonesFormulario, Campo } from '@/components/Campo';
import { api, ErrorApi } from '@/lib/api';
import { leerEntero, leerMonto } from '@/lib/formato';
import type { Categoria, Ingreso, Producto } from '@/lib/tipos';

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGEN = 5 * 1024 * 1024;

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
  const [imagen, setImagen] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  /** Al editar un campo, su mensaje de error desaparece. */
  const limpiar = (campo: string) => setErrores((e) => (e[campo] ? { ...e, [campo]: '' } : e));

  // Libera la memoria de la vista previa al cambiar de imagen o cerrar
  useEffect(() => () => { if (vistaPrevia) URL.revokeObjectURL(vistaPrevia); }, [vistaPrevia]);

  function elegirImagen(archivo: File | undefined) {
    setErrores((e) => ({ ...e, imagen: '' }));
    if (!archivo) return;
    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      setErrores((e) => ({ ...e, imagen: 'Usa una imagen JPG, PNG o WEBP' }));
      return;
    }
    if (archivo.size > MAX_IMAGEN) {
      setErrores((e) => ({ ...e, imagen: 'La imagen pesa más de 5 MB' }));
      return;
    }
    setImagen(archivo);
    setVistaPrevia(URL.createObjectURL(archivo));
  }

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
          producto: { codigo: codigoLimpio, nombre: nombre.trim(), categoriaId: categoria.id, precioUsd: prec },
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

      <Campo etiqueta="Cod" name="codigo" value={codigo} onChange={(e) => { setCodigo(e.target.value); limpiar('codigo'); }} error={errores.codigo} autoFocus autoComplete="off" className="uppercase" />
      <Campo etiqueta="Nombre" name="nombre" value={nombre} onChange={(e) => { setNombre(e.target.value); limpiar('nombre'); }} error={errores.nombre} autoComplete="off" />
      <Campo etiqueta="Cantidad" name="cantidad" inputMode="numeric" value={cantidad} onChange={(e) => { setCantidad(e.target.value); limpiar('cantidad'); }} error={errores.cantidad} />
      <Campo etiqueta="Precio" name="precio" inputMode="decimal" value={precio} onChange={(e) => { setPrecio(e.target.value); limpiar('precio'); }} error={errores.precio} ayuda="En dólares, ej. 2,80" />

      <div className="mb-3 grid grid-cols-[7.5rem_1fr] items-start gap-2">
        <span className="pt-1 font-mano text-xl uppercase text-cafe-oscuro">Imagen:</span>
        <div>
          <label className="flex aspect-[4/3] w-full max-w-[13rem] cursor-pointer items-center justify-center overflow-hidden rounded border-2 border-dashed border-cafe/60 bg-durazno-claro/50 text-center hover:bg-durazno-claro">
            {vistaPrevia ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vistaPrevia} alt="Vista previa" className="h-full w-full object-contain" />
            ) : (
              <span className="font-mano text-xl text-cafe">Insertar imagen</span>
            )}
            <input type="file" accept={TIPOS_IMAGEN.join(',')} className="sr-only" onChange={(e) => elegirImagen(e.target.files?.[0])} />
          </label>
          {imagen && (
            <button type="button" onClick={() => { setImagen(null); setVistaPrevia(null); }} className="mt-1 text-xs text-cafe underline">
              Quitar imagen
            </button>
          )}
          {errores.imagen && <p className="mt-1 text-xs text-ladrillo">{errores.imagen}</p>}
        </div>
      </div>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-cafe">Más datos (opcional)</summary>
        <div className="mt-3">
          <Campo etiqueta="Costo" name="costo" inputMode="decimal" value={costo} onChange={(e) => { setCosto(e.target.value); limpiar('costo'); }} error={errores.costo} ayuda="Costo por unidad en $, para calcular ganancia" />
          <Campo etiqueta="Nota" name="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Inventario inicial" />
        </div>
      </details>

      {errorGeneral && <p role="alert" className="mt-4 text-sm text-ladrillo">{errorGeneral}</p>}
      <BotonesFormulario alCancelar={alCancelar} enviando={enviando} />
    </form>
  );
}
