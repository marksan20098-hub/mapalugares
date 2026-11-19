import { FormEvent, useEffect, useState } from 'react';
import { Accessibility, AlertCircle, Crosshair, Footprints, X } from 'lucide-react';
import {
  AccessPoint,
  AccessPointInput,
  TipoEntrada,
  ValidationErrors,
  parseDecimalCoordinate,
  validateAccessPointFields,
  validateLatitudeValue,
  validateLongitudeValue,
} from '../types/accessPoint.ts';

interface PointFormModalProps {
  isOpen: boolean;
  editingPoint: AccessPoint | null;
  pickedCoords: { lat: number; lng: number } | null;
  mapCenter: { lat: number; lng: number };
  isSubmitting: boolean;
  serverError: string | null;
  onClose: () => void;
  onRequestMapPick: () => void;
  onSubmit: (data: AccessPointInput) => Promise<void>;
}

export function PointFormModal({
  isOpen,
  editingPoint,
  pickedCoords,
  mapCenter,
  isSubmitting,
  serverError,
  onClose,
  onRequestMapPick,
  onSubmit,
}: PointFormModalProps) {
  const [nombrePunto, setNombrePunto] = useState('');
  const [edificio, setEdificio] = useState('');
  const [calleAcceso, setCalleAcceso] = useState('');
  const [tipoEntrada, setTipoEntrada] = useState<TipoEntrada>('con rampa');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    if (editingPoint) {
      setNombrePunto(editingPoint.nombre_punto);
      setEdificio(editingPoint.edificio);
      setCalleAcceso(editingPoint.calle_acceso);
      setTipoEntrada(editingPoint.tipo_entrada);
      setLatitud(String(editingPoint.latitud));
      setLongitud(String(editingPoint.longitud));
    } else {
      setNombrePunto('');
      setEdificio('');
      setCalleAcceso('');
      setTipoEntrada('con rampa');
      setLatitud(String(mapCenter.lat));
      setLongitud(String(mapCenter.lng));
    }
    setErrors({});
    setTouched({});
  }, [isOpen, editingPoint]);

  useEffect(() => {
    if (!pickedCoords || !isOpen) return;
    const latStr = String(pickedCoords.lat);
    const lngStr = String(pickedCoords.lng);
    setLatitud(latStr);
    setLongitud(lngStr);
    setErrors((prev) => ({
      ...prev,
      latitud: validateLatitudeValue(latStr),
      longitud: validateLongitudeValue(lngStr),
    }));
  }, [pickedCoords, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLatChange = (val: string) => {
    setLatitud(val);
    setTouched((prev) => ({ ...prev, latitud: true }));
    setErrors((prev) => ({ ...prev, latitud: validateLatitudeValue(val) }));
  };

  const handleLngChange = (val: string) => {
    setLongitud(val);
    setTouched((prev) => ({ ...prev, longitud: true }));
    setErrors((prev) => ({ ...prev, longitud: validateLongitudeValue(val) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validateAccessPointFields({
      nombre_punto: nombrePunto,
      edificio,
      calle_acceso: calleAcceso,
      tipo_entrada: tipoEntrada,
      latitud,
      longitud,
    });

    setErrors(validationErrors);
    setTouched({
      nombre_punto: true,
      edificio: true,
      calle_acceso: true,
      tipo_entrada: true,
      latitud: true,
      longitud: true,
    });

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const parsedLat = parseDecimalCoordinate(latitud)!;
    const parsedLng = parseDecimalCoordinate(longitud)!;

    await onSubmit({
      nombre_punto: nombrePunto.trim(),
      edificio: edificio.trim(),
      calle_acceso: calleAcceso.trim(),
      tipo_entrada: tipoEntrada,
      latitud: parsedLat,
      longitud: parsedLng,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-point-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="modal-point-title" className="text-lg font-semibold text-slate-900">
            {editingPoint ? 'Editar punto de acceso' : 'Agregar punto de acceso'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 px-6 py-5">
          {serverError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{serverError}</span>
            </div>
          )}

          <div>
            <label htmlFor="nombre_punto" className="block text-sm font-medium text-slate-800">
              Nombre del punto
            </label>
            <input
              id="nombre_punto"
              type="text"
              value={nombrePunto}
              onChange={(e) => {
                setNombrePunto(e.target.value);
                if (touched.nombre_punto) {
                  setErrors((prev) => ({
                    ...prev,
                    nombre_punto: e.target.value.trim() ? undefined : 'El nombre del punto es obligatorio.',
                  }));
                }
              }}
              placeholder="Ej. Acceso Principal Paseo Colón"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
            />
            {errors.nombre_punto && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errors.nombre_punto}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edificio" className="block text-sm font-medium text-slate-800">
                Edificio
              </label>
              <input
                id="edificio"
                type="text"
                value={edificio}
                onChange={(e) => {
                  setEdificio(e.target.value);
                  if (touched.edificio) {
                    setErrors((prev) => ({
                      ...prev,
                      edificio: e.target.value.trim() ? undefined : 'El edificio es obligatorio.',
                    }));
                  }
                }}
                placeholder="Ej. Facultad de Ingeniería"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
              {errors.edificio && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.edificio}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="calle_acceso" className="block text-sm font-medium text-slate-800">
                Calle de acceso
              </label>
              <input
                id="calle_acceso"
                type="text"
                value={calleAcceso}
                onChange={(e) => {
                  setCalleAcceso(e.target.value);
                  if (touched.calle_acceso) {
                    setErrors((prev) => ({
                      ...prev,
                      calle_acceso: e.target.value.trim() ? undefined : 'La calle de acceso es obligatoria.',
                    }));
                  }
                }}
                placeholder="Ej. Av. Paseo Colón 850"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
              {errors.calle_acceso && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.calle_acceso}</span>
                </p>
              )}
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-800">
              Tipo de entrada
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTipoEntrada('con rampa')}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  tipoEntrada === 'con rampa'
                    ? 'border-teal-700 bg-teal-50 text-teal-900'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Accessibility className="h-4 w-4 shrink-0" />
                <span>Con rampa</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoEntrada('con escalones')}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  tipoEntrada === 'con escalones'
                    ? 'border-amber-700 bg-amber-50 text-amber-900'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Footprints className="h-4 w-4 shrink-0" />
                <span>Con escalones</span>
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-800">
                Coordenadas (grados decimales)
              </span>
              <button
                type="button"
                onClick={onRequestMapPick}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap"
              >
                <Crosshair className="h-3.5 w-3.5 text-teal-700" />
                <span>Elegir en el mapa</span>
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="latitud" className="block text-xs font-medium text-slate-700">
                  Latitud (-90 a 90)
                </label>
                <input
                  id="latitud"
                  type="text"
                  inputMode="decimal"
                  value={latitud}
                  onChange={(e) => handleLatChange(e.target.value)}
                  placeholder="-34.617638"
                  className={`font-mono-tabular mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    errors.latitud
                      ? 'border-red-400 focus:border-red-600 focus:ring-red-600/15'
                      : 'border-slate-300 focus:border-teal-700 focus:ring-teal-700/15'
                  }`}
                />
                {errors.latitud && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-red-600">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{errors.latitud}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="longitud" className="block text-xs font-medium text-slate-700">
                  Longitud (-180 a 180)
                </label>
                <input
                  id="longitud"
                  type="text"
                  inputMode="decimal"
                  value={longitud}
                  onChange={(e) => handleLngChange(e.target.value)}
                  placeholder="-58.368082"
                  className={`font-mono-tabular mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    errors.longitud
                      ? 'border-red-400 focus:border-red-600 focus:ring-red-600/15'
                      : 'border-slate-300 focus:border-teal-700 focus:ring-teal-700/15'
                  }`}
                />
                {errors.longitud && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-red-600">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{errors.longitud}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap"
            >
              {isSubmitting
                ? 'Guardando...'
                : editingPoint
                  ? 'Guardar cambios'
                  : 'Agregar punto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
