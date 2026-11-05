'use client';

import { useEffect, useState } from 'react';

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGEN = 5 * 1024 * 1024;

/**
 * Recuadro "Insertar imagen" del boceto, con vista previa.
 * Si el producto ya tiene imagen, se muestra y al elegir otra se avisa
 * que la reemplazará.
 */
export function SelectorImagen({
  imagenActual,
  archivo,
  alCambiar,
}: {
  imagenActual?: string | null;
  archivo: File | null;
  alCambiar: (archivo: File | null) => void;
}) {
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Vista previa del archivo elegido; se libera la memoria al cambiarlo o cerrar
  useEffect(() => {
    if (!archivo) {
      setVistaPrevia(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setVistaPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  function elegir(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!TIPOS_IMAGEN.includes(f.type)) return setError('Usa una imagen JPG, PNG o WEBP');
    if (f.size > MAX_IMAGEN) return setError('La imagen pesa más de 5 MB');
    alCambiar(f);
  }

  const mostrada = vistaPrevia ?? imagenActual ?? null;

  return (
    <div className="mb-3 grid grid-cols-[7.5rem_1fr] items-start gap-2">
      <span className="pt-1 font-mano text-xl uppercase text-cafe-oscuro">Imagen:</span>
      <div>
        <label className="group relative flex aspect-[4/3] w-full max-w-[13rem] cursor-pointer items-center justify-center overflow-hidden rounded border-2 border-dashed border-cafe/60 bg-durazno-claro/50 text-center hover:bg-durazno-claro">
          {mostrada ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mostrada} alt={vistaPrevia ? 'Imagen nueva' : 'Imagen actual'} className="h-full w-full object-contain" />
              {!vistaPrevia && (
                <span className="absolute inset-x-0 bottom-0 bg-cafe-oscuro/80 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Clic para cambiar
                </span>
              )}
            </>
          ) : (
            <span className="font-mano text-xl text-cafe">Insertar imagen</span>
          )}
          <input
            type="file"
            accept={TIPOS_IMAGEN.join(',')}
            className="sr-only"
            onChange={(e) => {
              elegir(e.target.files?.[0]);
              e.target.value = ''; // permite volver a elegir el mismo archivo
            }}
          />
        </label>

        {archivo ? (
          <p className="mt-1 text-xs">
            {imagenActual ? <span className="text-cafe-oscuro">Reemplazará la imagen actual. </span> : null}
            <button type="button" onClick={() => alCambiar(null)} className="text-cafe underline">
              {imagenActual ? 'Mantener la actual' : 'Quitar imagen'}
            </button>
          </p>
        ) : (
          imagenActual && <p className="mt-1 text-xs text-cafe">Imagen actual. Haz clic para cambiarla.</p>
        )}
        {error && <p className="mt-1 text-xs text-ladrillo">{error}</p>}
      </div>
    </div>
  );
}
