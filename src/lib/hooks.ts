import { useEffect, useState } from 'react';

/** Devuelve el valor solo cuando deja de cambiar por `ms` milisegundos. */
export function useRetardado<T>(valor: T, ms = 300): T {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}
