export type TipoEntrada = 'con rampa' | 'con escalones';

export interface AccessPoint {
  id: string;
  nombre_punto: string;
  latitud: number;
  longitud: number;
  edificio: string;
  calle_acceso: string;
  tipo_entrada: TipoEntrada;
  created_at: string;
  updated_at?: string;
}

export interface AccessPointInput {
  nombre_punto: string;
  latitud: number;
  longitud: number;
  edificio: string;
  calle_acceso: string;
  tipo_entrada: TipoEntrada;
}

export interface ValidationErrors {
  nombre_punto?: string;
  latitud?: string;
  longitud?: string;
  edificio?: string;
  calle_acceso?: string;
  tipo_entrada?: string;
}

export const INITIAL_SEED_POINTS: AccessPoint[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    nombre_punto: 'Acceso Principal Paseo Colón',
    latitud: -34.617638,
    longitud: -58.368082,
    edificio: 'Facultad de Ingeniería (UBA)',
    calle_acceso: 'Av. Paseo Colón 850',
    tipo_entrada: 'con rampa',
    created_at: '2026-11-19T12:00:00.000Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    nombre_punto: 'Ingreso Explanada Norte',
    latitud: -34.584297,
    longitud: -58.398156,
    edificio: 'Biblioteca Nacional Mariano Moreno',
    calle_acceso: 'Agüero 2502',
    tipo_entrada: 'con rampa',
    created_at: '2026-11-19T12:05:00.000Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    nombre_punto: 'Pórtico Plaza Libertad',
    latitud: -34.601041,
    longitud: -58.383078,
    edificio: 'Teatro Colón',
    calle_acceso: 'Cerrito 628',
    tipo_entrada: 'con escalones',
    created_at: '2026-11-19T12:10:00.000Z',
  },
];

export function parseDecimalCoordinate(raw: string | number): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return null;
  // Require standard decimal degrees format (optional leading -, digits, optional decimal digits)
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateLatitudeValue(value: string | number): string | undefined {
  const num = parseDecimalCoordinate(value);
  if (num === null) {
    return 'Ingresá una latitud válida en grados decimales (ej. -34.603722).';
  }
  if (num < -90 || num > 90) {
    return 'La latitud debe estar entre -90 y 90 grados decimales.';
  }
  return undefined;
}

export function validateLongitudeValue(value: string | number): string | undefined {
  const num = parseDecimalCoordinate(value);
  if (num === null) {
    return 'Ingresá una longitud válida en grados decimales (ej. -58.381592).';
  }
  if (num < -180 || num > 180) {
    return 'La longitud debe estar entre -180 y 180 grados decimales.';
  }
  return undefined;
}

export function validateAccessPointFields(fields: {
  nombre_punto: string;
  latitud: string | number;
  longitud: string | number;
  edificio: string;
  calle_acceso: string;
  tipo_entrada: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!fields.nombre_punto.trim()) {
    errors.nombre_punto = 'El nombre del punto es obligatorio.';
  } else if (fields.nombre_punto.trim().length > 140) {
    errors.nombre_punto = 'El nombre no puede superar los 140 caracteres.';
  }

  if (!fields.edificio.trim()) {
    errors.edificio = 'El edificio es obligatorio.';
  } else if (fields.edificio.trim().length > 140) {
    errors.edificio = 'El nombre del edificio no puede superar los 140 caracteres.';
  }

  if (!fields.calle_acceso.trim()) {
    errors.calle_acceso = 'La calle de acceso es obligatoria.';
  } else if (fields.calle_acceso.trim().length > 180) {
    errors.calle_acceso = 'La calle de acceso no puede superar los 180 caracteres.';
  }

  if (fields.tipo_entrada !== 'con rampa' && fields.tipo_entrada !== 'con escalones') {
    errors.tipo_entrada = 'Seleccioná "con rampa" o "con escalones".';
  }

  const latError = validateLatitudeValue(fields.latitud);
  if (latError) {
    errors.latitud = latError;
  }

  const lngError = validateLongitudeValue(fields.longitud);
  if (lngError) {
    errors.longitud = lngError;
  }

  return errors;
}
