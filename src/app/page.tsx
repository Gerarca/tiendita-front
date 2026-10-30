'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Cargando } from '@/components/Estados';

/** La exportación estática no permite redirecciones del servidor: se hace en el navegador. */
export default function Inicio() {
  const router = useRouter();
  useEffect(() => router.replace('/inventario/'), [router]);
  return <Cargando />;
}
