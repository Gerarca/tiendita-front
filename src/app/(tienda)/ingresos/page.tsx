'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Dialogo } from '@/components/Dialogo';
import { Cargando, MensajeError } from '@/components/Estados';
import { FormProductoExistente } from '@/components/ingresos/FormProductoExistente';
import { FormProductoNuevo } from '@/components/ingresos/FormProductoNuevo';
import { UltimosIngresos } from '@/components/ingresos/UltimosIngresos';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import type { Categoria } from '@/lib/tipos';

const botonCategoria = (activa: boolean) =>
  `rounded border-2 px-3 py-2.5 font-mano text-xl uppercase leading-tight transition-colors ${
    activa ? 'border-cafe-oscuro bg-durazno-claro text-tinta' : 'border-cafe/50 text-tinta/80 hover:border-cafe hover:bg-durazno-claro/50'
  }`;

export default function PaginaIngresos() {
  const { usuario } = useSesion();
  const esAdmin = usuario?.rol === 'ADMIN';
  const [principalId, setPrincipalId] = useState<number | null>(null);
  const [subId, setSubId] = useState<number | null>(null);
  const [dialogo, setDialogo] = useState<'nuevo' | 'existente' | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const categorias = useQuery({ queryKey: ['categorias'], queryFn: () => api<Categoria[]>('/categorias') });

  if (categorias.isLoading) return <Cargando />;
  if (categorias.error) return <MensajeError error={categorias.error} alReintentar={() => categorias.refetch()} />;

  const principal = categorias.data?.find((c) => c.id === principalId) ?? null;
  const hijas = principal?.hijas ?? [];
  const sub = hijas.find((h) => h.id === subId) ?? null;
  // Los productos nuevos van en una categoría sin subcategorías
  const destinoNuevo = principal && hijas.length === 0 ? principal : sub;
  // Para buscar existentes basta la categoría principal (incluye sus subcategorías)
  const ambitoExistente = sub ?? principal;

  function terminar(texto: string) {
    setDialogo(null);
    setMensaje(texto);
  }

  return (
    <div>
      {mensaje && (
        <div role="status" className="mb-5 flex items-start justify-between gap-4 rounded border-l-4 border-salvia bg-salvia/10 px-4 py-3">
          <p>{mensaje}</p>
          <button onClick={() => setMensaje(null)} aria-label="Cerrar aviso" className="text-xl leading-none text-salvia">
            ×
          </button>
        </div>
      )}

      <p className="mb-4 text-cafe-oscuro">Elige la categoría del material que entra a la tienda.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categorias.data?.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setPrincipalId(c.id);
              setSubId(null);
            }}
            aria-pressed={c.id === principalId}
            className={botonCategoria(c.id === principalId)}
          >
            {c.nombre}
          </button>
        ))}
      </div>

      {principal && hijas.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm text-cafe-oscuro">Subcategoría de {principal.nombre}:</p>
          <div className="flex flex-wrap gap-2">
            {hijas.map((h) => (
              <button
                key={h.id}
                onClick={() => setSubId(h.id === subId ? null : h.id)}
                aria-pressed={h.id === subId}
                className={`rounded-full border-2 px-4 py-1 font-mano text-lg uppercase ${
                  h.id === subId ? 'border-cafe-oscuro bg-durazno-claro' : 'border-cafe/40 hover:border-cafe'
                }`}
              >
                {h.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {principal && (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-cafe/30 pt-5">
          {esAdmin && (
            <button
              onClick={() => setDialogo('nuevo')}
              disabled={!destinoNuevo}
              className="rounded bg-cafe-oscuro px-5 py-2 font-mano text-xl uppercase text-white hover:bg-cafe disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Producto nuevo
            </button>
          )}
          <button
            onClick={() => setDialogo('existente')}
            className="rounded border-2 border-cafe-oscuro px-5 py-2 font-mano text-xl uppercase text-cafe-oscuro hover:bg-durazno-claro"
          >
            Producto existente
          </button>
          {esAdmin && !destinoNuevo && (
            <p className="text-sm text-cafe">Para crear un producto nuevo, elige primero su subcategoría.</p>
          )}
        </div>
      )}

      <Dialogo abierto={dialogo === 'nuevo'} titulo="Nuevo" alCerrar={() => setDialogo(null)}>
        {dialogo === 'nuevo' && destinoNuevo && (
          <FormProductoNuevo categoria={destinoNuevo} alCancelar={() => setDialogo(null)} alTerminar={terminar} />
        )}
      </Dialogo>

      <Dialogo abierto={dialogo === 'existente'} titulo="Existente" alCerrar={() => setDialogo(null)}>
        {dialogo === 'existente' && ambitoExistente && (
          <FormProductoExistente
            categoriaId={ambitoExistente.id}
            nombreCategoria={ambitoExistente.nombre}
            esAdmin={esAdmin}
            alCancelar={() => setDialogo(null)}
            alTerminar={terminar}
          />
        )}
      </Dialogo>

      <UltimosIngresos />
    </div>
  );
}
