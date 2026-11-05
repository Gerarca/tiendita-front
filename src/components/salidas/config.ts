/**
 * Regalos y Traspasos funcionan igual (salida de mercancía sin cobro).
 * Solo cambian las etiquetas, los textos y el endpoint de la API.
 */
export interface ConfigSalida {
  endpoint: '/regalos' | '/traspasos';
  /** Clave de caché de la lista */
  clave: 'regalos' | 'traspasos';
  /** "regalo" / "traspaso" (para los textos) */
  singular: string;
  destino: { campo: 'beneficiario' | 'departamento'; etiqueta: string; placeholder: string; columna: string; pendiente: string };
  motivo: { campo: 'motivo' | 'hermanaEncargada'; etiqueta: string; placeholder: string; columna: string; pendiente: string; minimo: number };
  /** Ancho de la columna de etiquetas (clase completa para que Tailwind la genere) */
  columnasEtiqueta: string;
  tituloLista: string;
  vacioLista: string;
  avisoSoloAdmin: string;
}

export const CONFIG_REGALOS: ConfigSalida = {
  endpoint: '/regalos',
  clave: 'regalos',
  singular: 'regalo',
  destino: { campo: 'beneficiario', etiqueta: 'Beneficiario', placeholder: 'Persona o institución', columna: 'Beneficiario', pendiente: 'indica quién recibe el regalo' },
  motivo: { campo: 'motivo', etiqueta: 'Motivo', placeholder: 'Ej. Donación para la fiesta patronal', columna: 'Motivo', pendiente: 'escribe el motivo', minimo: 3 },
  columnasEtiqueta: 'grid-cols-[9rem_1fr]',
  tituloLista: 'Regalos de este mes',
  vacioLista: 'No se han registrado regalos este mes.',
  avisoSoloAdmin: 'Solo un administrador puede registrar regalos. Aquí puedes consultar los de este mes.',
};

export const CONFIG_TRASPASOS: ConfigSalida = {
  endpoint: '/traspasos',
  clave: 'traspasos',
  singular: 'traspaso',
  destino: { campo: 'departamento', etiqueta: 'Departamento de venta', placeholder: 'Ej. Feria de la parroquia', columna: 'Departamento de venta', pendiente: 'indica el departamento de venta' },
  motivo: { campo: 'hermanaEncargada', etiqueta: 'Hermana encargada', placeholder: 'Nombre de la hermana', columna: 'Hermana encargada', pendiente: 'indica la hermana encargada', minimo: 2 },
  columnasEtiqueta: 'grid-cols-[14rem_1fr]',
  tituloLista: 'Traspasos de este mes',
  vacioLista: 'No se han registrado traspasos este mes.',
  avisoSoloAdmin: 'Solo un administrador puede registrar traspasos. Aquí puedes consultar los de este mes.',
};
