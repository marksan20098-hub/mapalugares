import { useEffect, useState } from 'react';
import {
  APIProvider,
  APILoadingStatus,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  MapMouseEvent,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Accessibility, Footprints, LocateFixed, MapPin, Navigation } from 'lucide-react';
import { AccessPoint } from '../types/accessPoint.ts';

interface AccessMapProps {
  points: AccessPoint[];
  selectedPoint: AccessPoint | null;
  onSelectPoint: (point: AccessPoint | null) => void;
  focusRequestTick: number;
  fitAllRequestTick: number;
  isPickingLocation: boolean;
  onPickLocation: (coords: { lat: number; lng: number }) => void;
  onCancelPicking: () => void;
  onCenterChange?: (center: { lat: number; lng: number }) => void;
}

const DEFAULT_CENTER = { lat: -34.601041, lng: -58.383078 };
const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

function MapLoadingMonitor() {
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-50/95 p-6 text-center">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6">
          <MapPin className="mx-auto mb-3 h-7 w-7 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-900">
            No se pudo cargar Google Maps
          </h3>
          <p className="mt-1.5 text-sm text-slate-600">
            Verificá que la clave de API de Google Maps esté habilitada y tenga permisos para Maps JavaScript API.
          </p>
        </div>
      </div>
    );
  }

  if (status === APILoadingStatus.LOADING) {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-100/70">
        <span className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
          Cargando mapa...
        </span>
      </div>
    );
  }

  return null;
}

function MapViewportController({
  points,
  selectedPoint,
  focusRequestTick,
  fitAllRequestTick,
  onCenterChange,
}: {
  points: AccessPoint[];
  selectedPoint: AccessPoint | null;
  focusRequestTick: number;
  fitAllRequestTick: number;
  onCenterChange?: (center: { lat: number; lng: number }) => void;
}) {
  const map = useMap();
  const coreLib = useMapsLibrary('core');

  useEffect(() => {
    if (!map || !selectedPoint) return;
    map.panTo({ lat: selectedPoint.latitud, lng: selectedPoint.longitud });
    const currentZoom = map.getZoom() ?? 13;
    if (currentZoom < 15) {
      map.setZoom(16);
    }
  }, [map, selectedPoint, focusRequestTick]);

  useEffect(() => {
    if (!map || !coreLib || fitAllRequestTick === 0 || points.length === 0) return;
    if (points.length === 1) {
      map.panTo({ lat: points[0].latitud, lng: points[0].longitud });
      map.setZoom(16);
      return;
    }
    const bounds = new coreLib.LatLngBounds();
    points.forEach((pt) => {
      bounds.extend({ lat: pt.latitud, lng: pt.longitud });
    });
    map.fitBounds(bounds, { top: 64, right: 48, bottom: 64, left: 48 });
  }, [map, coreLib, points, fitAllRequestTick]);

  useEffect(() => {
    if (!map || !onCenterChange) return;
    const listener = map.addListener('idle', () => {
      const center = map.getCenter();
      if (center) {
        onCenterChange({
          lat: Number(center.lat().toFixed(6)),
          lng: Number(center.lng().toFixed(6)),
        });
      }
    });
    return () => {
      listener.remove();
    };
  }, [map, onCenterChange]);

  return null;
}

function AccessPointMarker({
  point,
  isSelected,
  onSelect,
  onCloseInfo,
}: {
  point: AccessPoint;
  isSelected: boolean;
  onSelect: (point: AccessPoint) => void;
  onCloseInfo: () => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const isRamp = point.tipo_entrada === 'con rampa';

  const pinColors = isRamp
    ? {
        background: isSelected ? '#0F766E' : '#0D9488',
        borderColor: '#115E59',
        glyphColor: '#FFFFFF',
      }
    : {
        background: isSelected ? '#B45309' : '#D97706',
        borderColor: '#92400E',
        glyphColor: '#FFFFFF',
      };

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: point.latitud, lng: point.longitud }}
        title={point.nombre_punto}
        onClick={() => onSelect(point)}
        zIndex={isSelected ? 50 : 10}
      >
        <Pin
          background={pinColors.background}
          borderColor={pinColors.borderColor}
          glyphColor={pinColors.glyphColor}
          scale={isSelected ? 1.3 : 1.0}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={290}
          onCloseClick={onCloseInfo}
        >
          <div className="p-1 text-slate-900">
            <h3 className="text-sm font-semibold leading-snug text-slate-900">
              {point.nombre_punto}
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-700">
              {point.edificio}
            </p>
            <p className="text-xs text-slate-600">{point.calle_acceso}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-800">
              {isRamp ? (
                <Accessibility className="h-3.5 w-3.5 text-teal-700 shrink-0" />
              ) : (
                <Footprints className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              )}
              <span>{isRamp ? 'Con rampa' : 'Con escalones'}</span>
            </div>
            <p className="font-mono-tabular mt-1.5 border-t border-slate-200 pt-1.5 text-[11px] text-slate-600">
              {point.latitud.toFixed(6)}, {point.longitud.toFixed(6)}
            </p>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function AccessMap({
  points,
  selectedPoint,
  onSelectPoint,
  focusRequestTick,
  fitAllRequestTick,
  isPickingLocation,
  onPickLocation,
  onCancelPicking,
  onCenterChange,
}: AccessMapProps) {
  const [infoClosedManually, setInfoClosedManually] = useState(false);

  useEffect(() => {
    setInfoClosedManually(false);
  }, [selectedPoint?.id, focusRequestTick]);

  const handleMapClick = (event: MapMouseEvent) => {
    if (!isPickingLocation) return;
    const latLng = event.detail.latLng;
    if (!latLng) return;
    onPickLocation({
      lat: Number(latLng.lat.toFixed(6)),
      lng: Number(latLng.lng.toFixed(6)),
    });
  };

  if (!MAPS_API_KEY) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 p-6 text-center">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6">
          <MapPin className="mx-auto mb-3 h-7 w-7 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-900">
            Clave de Google Maps no configurada
          </h3>
          <p className="mt-1.5 text-sm text-slate-600">
            Configurá <code className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</code> para habilitar la vista interactiva del mapa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-slate-100">
      <APIProvider apiKey={MAPS_API_KEY} libraries={['marker']} language="es" region="AR">
        <MapLoadingMonitor />

        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={13}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={true}
          onClick={handleMapClick}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          className="h-full w-full"
        >
          <MapViewportController
            points={points}
            selectedPoint={selectedPoint}
            focusRequestTick={focusRequestTick}
            fitAllRequestTick={fitAllRequestTick}
            onCenterChange={onCenterChange}
          />

          {points.map((point) => (
            <AccessPointMarker
              key={point.id}
              point={point}
              isSelected={selectedPoint?.id === point.id && !infoClosedManually}
              onSelect={(pt) => {
                setInfoClosedManually(false);
                onSelectPoint(pt);
              }}
              onCloseInfo={() => setInfoClosedManually(true)}
            />
          ))}
        </GoogleMap>
      </APIProvider>

      {isPickingLocation && (
        <div className="absolute top-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-teal-700 bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
          <LocateFixed className="h-4 w-4 text-teal-400 shrink-0" />
          <span className="whitespace-nowrap">Hacé clic en el mapa para fijar las coordenadas</span>
          <button
            type="button"
            onClick={onCancelPicking}
            className="ml-2 rounded border border-slate-600 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Cancelar
          </button>
        </div>
      )}

      {selectedPoint && !isPickingLocation && (
        <div className="pointer-events-none absolute right-4 bottom-4 left-4 z-10 flex justify-start md:right-auto md:max-w-md">
          <div className="pointer-events-auto w-full rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">
                  Punto seleccionado
                </p>
                <h3 className="mt-0.5 truncate text-base font-semibold text-slate-900">
                  {selectedPoint.nombre_punto}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInfoClosedManually(false);
                  onSelectPoint(selectedPoint);
                }}
                title="Centrar en el mapa"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>Centrar</span>
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
              <span>{selectedPoint.edificio}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedPoint.calle_acceso}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                {selectedPoint.tipo_entrada === 'con rampa' ? (
                  <Accessibility className="h-3.5 w-3.5 text-teal-700" />
                ) : (
                  <Footprints className="h-3.5 w-3.5 text-amber-700" />
                )}
                <span>
                  {selectedPoint.tipo_entrada === 'con rampa' ? 'Con rampa' : 'Con escalones'}
                </span>
              </span>
              <span className="font-mono-tabular text-slate-600">
                {selectedPoint.latitud.toFixed(6)}, {selectedPoint.longitud.toFixed(6)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
