import { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import { AccessPoint } from '../types/accessPoint.ts';

interface DeleteConfirmModalProps {
  point: AccessPoint | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmModal({
  point,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  useEffect(() => {
    if (!point) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [point, onCancel]);

  if (!point) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="delete-modal-title" className="text-base font-semibold text-slate-900">
            Eliminar punto de acceso
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar confirmación"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-slate-700">
            ¿Querés eliminar <strong className="font-semibold text-slate-900">{point.nombre_punto}</strong> ({point.edificio})? Esta acción quitará el registro y su marcador del mapa.
          </p>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isDeleting ? 'Eliminando...' : 'Eliminar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
