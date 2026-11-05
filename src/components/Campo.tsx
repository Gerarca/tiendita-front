import type { InputHTMLAttributes, ReactNode } from 'react';

/** Etiqueta + campo, alineados como en los bocetos ("COD: ____"). */
export function Campo({
  etiqueta,
  ayuda,
  error,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: ReactNode; error?: string | null }) {
  const id = input.id ?? input.name;
  return (
    <div className="mb-3">
      <div className="grid grid-cols-[7.5rem_1fr] items-center gap-2">
        <label htmlFor={id} className="font-mano text-xl uppercase text-cafe-oscuro">
          {etiqueta}:
        </label>
        <input
          id={id}
          {...input}
          aria-invalid={error ? true : undefined}
          className={`w-full border-b-2 bg-transparent px-1 py-1 outline-none focus:border-cafe ${
            error ? 'border-ladrillo' : 'border-cafe/40'
          } ${input.className ?? ''}`}
        />
      </div>
      {ayuda && !error && <p className="mt-1 pl-[8rem] text-xs text-cafe">{ayuda}</p>}
      {error && <p className="mt-1 pl-[8rem] text-xs text-ladrillo">{error}</p>}
    </div>
  );
}

/** Botones del pie de los formularios: CANCELAR a la izquierda, GUARDAR a la derecha (como el boceto). */
export function BotonesFormulario({ alCancelar, enviando, textoGuardar = 'Guardar' }: { alCancelar: () => void; enviando: boolean; textoGuardar?: string }) {
  return (
    <div className="mt-6 flex justify-between">
      <button type="button" onClick={alCancelar} className="rounded border-2 border-cafe/60 px-4 py-1.5 font-mano text-xl uppercase text-cafe-oscuro hover:bg-durazno-claro">
        Cancelar
      </button>
      <button type="submit" data-flujo={9} disabled={enviando} className="rounded bg-cafe-oscuro px-5 py-1.5 font-mano text-xl uppercase text-white hover:bg-cafe disabled:opacity-60">
        {enviando ? 'Guardando…' : textoGuardar}
      </button>
    </div>
  );
}
