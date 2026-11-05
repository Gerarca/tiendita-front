'use client';

import { CONFIG_TRASPASOS } from '@/components/salidas/config';
import { PantallaSalida } from '@/components/salidas/PantallaSalida';

export default function PaginaTraspasos() {
  return <PantallaSalida config={CONFIG_TRASPASOS} />;
}
