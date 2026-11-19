import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accessibility,
  AlertCircle,
  Footprints,
  Maximize2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { AccessMap } from './components/AccessMap.tsx';
import { DeleteConfirmModal } from './components/DeleteConfirmModal.tsx';
import { PointFormModal } from './components/PointFormModal.tsx';
import { AccessPoint, AccessPointInput, TipoEntrada } from './types/accessPoint.ts';

type FilterType = 'todos' | TipoEntrada;

export default function App() {
  const [points, setPoints] = useState<AccessPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const [filterType, setFilterType] = useState<FilterType>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusRequestTick, setFocusRequestTick] = useState(0);
  const [fitAllRequestTick, setFitAllRequestTick] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<AccessPoint | null>(null);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: -34.601041,
    lng: -58.383078,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [pointToDelete, setPointToDelete] = useState<AccessPoint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  const fetchPoints = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/points');
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'No se pudieron cargar los puntos de acceso.');
      }
      const data = (await response.json()) as AccessPoint[];
      setPoints(data);
      setSelectedId((prev) => {
        if (prev && data.some((p) => p.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const filteredPoints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return points.filter((point) => {
      if (filterType !== 'todos' && point.tipo_entrada !== filterType) {
        return false;
      }
      if (!q) return true;
      return (
        point.nombre_punto.toLowerCase().includes(q) ||
        point.edificio.toLowerCase().includes(q) ||
        point.calle_acceso.toLowerCase().includes(q)
      );
    });
  }, [points, filterType, searchQuery]);

  const selectedPoint = useMemo(() => {
    if (!selectedId) return null;
    return filteredPoints.find((p) => p.id === selectedId) ?? null;
  }, [filteredPoints, selectedId]);

  useEffect(() => {
    if (filteredPoints.length > 0 && !selectedPoint) {
      setSelectedId(filteredPoints[0].id);
    }
  }, [filteredPoints, selectedPoint]);

  const handleOpenCreate = () => {
    setEditingPoint(null);
    setPickedCoords(null);
    setFormError(null);
    setIsPickingLocation(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (point: AccessPoint) => {
    setEditingPoint(point);
    setPickedCoords(null);
    setFormError(null);
    setIsPickingLocation(false);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (payload: AccessPointInput) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const url = editingPoint ? `/api/points/${editingPoint.id}` : '/api/points';
      const method = editingPoint ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'No se pudo guardar el registro.');
      }

      const saved = (await response.json()) as AccessPoint;
      setPoints((prev) => {
        if (editingPoint) {
          return prev.map((item) => (item.id === saved.id ? saved : item));
        }
        return [...prev, saved];
      });
      setSelectedId(saved.id);
      setFocusRequestTick((t) => t + 1);
      setIsFormOpen(false);
      setEditingPoint(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pointToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/points/${pointToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 204) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'No se pudo eliminar el registro.');
      }

      const deletedId = pointToDelete.id;
      setPoints((prev) => prev.filter((item) => item.id !== deletedId));
      setPointToDelete(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error al eliminar el registro.');
      setPointToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectFromList = (point: AccessPoint) => {
    setSelectedId(point.id);
    setFocusRequestTick((t) => t + 1);
  };

  const rampCount = useMemo(
    () => points.filter((p) => p.tipo_entrada === 'con rampa').length,
    [points]
  );
  const stepsCount = useMemo(
    () => points.filter((p) => p.tipo_entrada === 'con escalones').length,
    [points]
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {quotaExceeded && (
        <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-900 shadow-sm md:text-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-amber-950 underline hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Three-Zone Top Bar */}
      <header className="flex items-center justify-between gap-8 border-b border-slate-200 bg-white px-6 py-3.5">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setFilterType('todos');
            setSearchQuery('');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          AccesoUrbano
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <button
            type="button"
            onClick={() => setFilterType('todos')}
            className={`transition-colors hover:text-slate-900 whitespace-nowrap shrink-0 ${
              filterType === 'todos' ? 'text-slate-900 underline underline-offset-4' : ''
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilterType('con rampa')}
            className={`transition-colors hover:text-slate-900 whitespace-nowrap shrink-0 ${
              filterType === 'con rampa' ? 'text-slate-900 underline underline-offset-4' : ''
            }`}
          >
            Con rampa
          </button>
          <button
            type="button"
            onClick={() => setFilterType('con escalones')}
            className={`transition-colors hover:text-slate-900 whitespace-nowrap shrink-0 ${
              filterType === 'con escalones' ? 'text-slate-900 underline underline-offset-4' : ''
            }`}
          >
            Con escalones
          </button>
          <button
            type="button"
            onClick={() => setFitAllRequestTick((t) => t + 1)}
            className="transition-colors hover:text-slate-900 whitespace-nowrap shrink-0"
          >
            Ajustar mapa
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Agregar punto</span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[440px_1fr]">
        {/* Left Directory & Filter Panel */}
        <section
          aria-label="Listado de puntos de acceso"
          className="flex flex-col border-b border-slate-200 bg-white lg:h-[calc(100vh-61px)] lg:border-r lg:border-b-0"
        >
          <div className="space-y-3 border-b border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-base font-semibold text-slate-900">
                Puntos de acceso
              </h1>
              <button
                type="button"
                onClick={() => setFitAllRequestTick((t) => t + 1)}
                title="Ajustar mapa a todos los puntos visibles"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap lg:hidden"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Ver todos</span>
              </button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, edificio o calle..."
                aria-label="Buscar puntos de acceso"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
            </div>

            {/* Interactive Filter Control */}
            <div
              role="group"
              aria-label="Filtrar por tipo de entrada"
              className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"
            >
              <button
                type="button"
                onClick={() => setFilterType('todos')}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  filterType === 'todos'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({points.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('con rampa')}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  filterType === 'con rampa'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Con rampa ({rampCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('con escalones')}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  filterType === 'con escalones'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Con escalones ({stepsCount})
              </button>
            </div>

            <p className="text-xs text-slate-500">
              <span>{filteredPoints.length} mostrados</span>
              <span aria-hidden="true"> · </span>
              <span>Grados decimales (WGS84)</span>
            </p>
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto">
            {loadError && (
              <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div className="flex-1">
                    <p>{loadError}</p>
                    <button
                      type="button"
                      onClick={fetchPoints}
                      className="mt-2 text-xs font-semibold text-red-900 underline"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="divide-y divide-slate-200">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="animate-pulse space-y-2.5 p-4">
                    <div className="h-4 w-2/3 rounded bg-slate-200" />
                    <div className="h-3.5 w-1/2 rounded bg-slate-100" />
                    <div className="h-3 w-3/4 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : filteredPoints.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-slate-800">
                  No hay puntos que coincidan con el filtro actual.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Probá limpiar la búsqueda o agregar un nuevo punto de acceso.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  {(filterType !== 'todos' || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('todos');
                        setSearchQuery('');
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Limpiar filtros
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800"
                  >
                    Agregar punto
                  </button>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {filteredPoints.map((point) => {
                  const isSelected = selectedPoint?.id === point.id;
                  const isRamp = point.tipo_entrada === 'con rampa';

                  return (
                    <li
                      key={point.id}
                      onClick={() => handleSelectFromList(point)}
                      className={`cursor-pointer p-4 transition-colors ${
                        isSelected
                          ? 'bg-teal-50/65'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-sm font-semibold text-slate-900">
                            {point.nombre_punto}
                          </h2>
                          <p className="mt-0.5 truncate text-xs text-slate-600">
                            <span>{point.edificio}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{point.calle_acceso}</span>
                          </p>
                        </div>

                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(point)}
                            aria-label={`Editar ${point.nombre_punto}`}
                            title="Editar punto"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPointToDelete(point)}
                            aria-label={`Eliminar ${point.nombre_punto}`}
                            title="Eliminar punto"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-100 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                          {isRamp ? (
                            <Accessibility className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                          ) : (
                            <Footprints className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                          )}
                          <span>{isRamp ? 'Con rampa' : 'Con escalones'}</span>
                        </span>

                        <span className="font-mono-tabular text-slate-500">
                          {point.latitud.toFixed(6)}, {point.longitud.toFixed(6)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Right Interactive Google Map Panel */}
        <section
          aria-label="Mapa interactivo de Google Maps"
          className="h-[460px] w-full lg:h-[calc(100vh-61px)]"
        >
          <AccessMap
            points={filteredPoints}
            selectedPoint={selectedPoint}
            onSelectPoint={(pt) => {
              if (pt) {
                setSelectedId(pt.id);
                setFocusRequestTick((t) => t + 1);
              }
            }}
            focusRequestTick={focusRequestTick}
            fitAllRequestTick={fitAllRequestTick}
            isPickingLocation={isPickingLocation}
            onPickLocation={(coords) => {
              setPickedCoords(coords);
              setIsPickingLocation(false);
              setIsFormOpen(true);
            }}
            onCancelPicking={() => {
              setIsPickingLocation(false);
              setIsFormOpen(true);
            }}
            onCenterChange={setMapCenter}
          />
        </section>
      </main>

      <PointFormModal
        isOpen={isFormOpen && !isPickingLocation}
        editingPoint={editingPoint}
        pickedCoords={pickedCoords}
        mapCenter={mapCenter}
        isSubmitting={isSubmitting}
        serverError={formError}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPoint(null);
          setFormError(null);
        }}
        onRequestMapPick={() => {
          setIsFormOpen(false);
          setIsPickingLocation(true);
        }}
        onSubmit={handleFormSubmit}
      />

      <DeleteConfirmModal
        point={pointToDelete}
        isDeleting={isDeleting}
        onCancel={() => setPointToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
