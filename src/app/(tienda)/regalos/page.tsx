'use client';

import { CONFIG_REGALOS } from '@/components/salidas/config';
import { PantallaSalida } from '@/components/salidas/PantallaSalida';

export default function PaginaRegalos() {
  return <PantallaSalida config={CONFIG_REGALOS} />;
}
