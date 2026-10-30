import { ErrorApi } from '@/lib/api';

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <p role="status" className="py-10 text-center font-mano text-xl text-cafe">
      {texto}
    </p>
  );
}

export function MensajeError({ error, alReintentar }: { error: unknown; alReintentar?: () => void }) {
  const mensaje = error instanceof ErrorApi ? error.message : 'Ocurrió un error inesperado';
  return (
    <div role="alert" className="mx-auto my-8 max-w-md rounded-md border border-ladrillo/40 bg-ladrillo/5 p-4 text-center">
      <p className="text-ladrillo">{mensaje}</p>
      {alReintentar && (
        <button onClick={alReintentar} className="mt-3 rounded border border-cafe px-3 py-1 text-sm text-cafe-oscuro hover:bg-durazno-claro">
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}
