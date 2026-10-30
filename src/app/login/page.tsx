'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ErrorApi } from '@/lib/api';
import { useSesion } from '@/lib/sesion';

export default function PaginaLogin() {
  const { usuario, iniciar } = useSesion();
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (usuario) router.replace('/inventario/');
  }, [usuario, router]);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await iniciar(nombre, password);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-lg border-2 border-cafe bg-white p-8">
        <h1 className="text-center font-mano text-4xl text-tinta">Tienda del Monasterio</h1>
        <p className="mb-6 mt-1 text-center text-sm text-cafe-oscuro">Inicia sesión para continuar</p>

        <label className="block text-sm font-semibold text-cafe-oscuro" htmlFor="usuario">
          Usuario
        </label>
        <input
          id="usuario"
          autoComplete="username"
          autoFocus
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="mb-4 mt-1 w-full rounded border border-cafe/50 px-3 py-2 focus:border-cafe"
        />

        <label className="block text-sm font-semibold text-cafe-oscuro" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border border-cafe/50 px-3 py-2 focus:border-cafe"
        />

        {error && (
          <p role="alert" className="mt-4 text-sm text-ladrillo">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="mt-6 w-full rounded bg-cafe-oscuro py-2.5 font-mano text-xl tracking-wide text-white hover:bg-cafe disabled:opacity-60"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
