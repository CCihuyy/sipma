import { Fragment, useEffect, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Edit2, X } from 'lucide-react';

type CoordinateValue = number | string | null | undefined;

export type RoomCoordinates = {
  latitude: number;
  longitude: number;
};

export type RoomMapPointItem = {
  id: number | string;
  title: string;
  subtitle?: string;
  status?: 'active' | 'inactive';
};

export type RoomData = {
  id: number;
  name: string;
};

export type RoomMapPoint = {
  id: number | string;
  title: string;
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
  location?: string;
  meta?: string;
  radiusMeters?: number | string | null | undefined;
  roomNames?: string[];
  rooms?: RoomData[];
  items?: RoomMapPointItem[];
};

export interface RoomMapProps {
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
  radiusMeters?: CoordinateValue;
  editable?: boolean;
  onSelectLocation?: (coords: RoomCoordinates) => void;
  onEditRoom?: (roomId: number, newName: string) => Promise<void>;
  onEditPointTitle?: (latitude: number, longitude: number, newTitle: string) => Promise<void>;
  studentPosition?: RoomCoordinates | null;
  roomPoints?: RoomMapPoint[];
  height?: string;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [-6.200000, 106.816666];
const DEFAULT_ZOOM = 13;
const LeafletMapContainer = MapContainer as any;
const LeafletTileLayer = TileLayer as any;
const LeafletCircle = Circle as any;
const LeafletCircleMarker = CircleMarker as any;
const LeafletPopup = Popup as any;

const normalizeNumber = (value: CoordinateValue) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
};

const MapClickHandler = ({
  editable,
  onSelectLocation,
}: {
  editable?: boolean;
  onSelectLocation?: (coords: RoomCoordinates) => void;
}) => {
  useMapEvents({
    click: (event: any) => {
      if (!editable || !onSelectLocation) {
        return;
      }

      onSelectLocation({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
};

const RecenterMap = ({ center }: { center: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, Math.max(map.getZoom(), 15), {
      animate: true,
    });
  }, [center, map]);

  return null;
};

const FitPoints = ({ points }: { points: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 15), {
        animate: true,
      });
      return;
    }

    map.fitBounds(points as any, {
      padding: [48, 48],
      animate: true,
    });
  }, [map, points]);

  return null;
};

export const RoomMap = ({
  latitude,
  longitude,
  radiusMeters,
  editable = false,
  onSelectLocation,
  onEditRoom,
  onEditPointTitle,
  studentPosition,
  roomPoints,
  height = '320px',
  className = '',
}: RoomMapProps) => {
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editingPointCoords, setEditingPointCoords] = useState<{lat: number; lon: number} | null>(null);
  const [editingPointTitle, setEditingPointTitle] = useState('');
  const [isEditPointLoading, setIsEditPointLoading] = useState(false);

  const handleEditRoom = async (roomId: number, currentName: string) => {
    setEditingRoomId(roomId);
    setEditingRoomName(currentName);
  };

  const handleSaveRoomName = async () => {
    if (!onEditRoom || editingRoomId === null || !editingRoomName.trim()) {
      return;
    }

    try {
      setIsEditLoading(true);
      await onEditRoom(editingRoomId, editingRoomName.trim());
      setEditingRoomId(null);
      setEditingRoomName('');
    } catch (error) {
      console.error('Error editing room:', error);
      alert('Gagal mengubah nama ruangan');
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleEditPointTitle = (lat: number, lon: number, currentTitle: string) => {
    setEditingPointCoords({ lat, lon });
    setEditingPointTitle(currentTitle);
  };

  const handleSavePointTitle = async () => {
    if (!onEditPointTitle || !editingPointCoords || !editingPointTitle.trim()) {
      return;
    }

    try {
      setIsEditPointLoading(true);
      await onEditPointTitle(editingPointCoords.lat, editingPointCoords.lon, editingPointTitle.trim());
      setEditingPointCoords(null);
      setEditingPointTitle('');
    } catch (error) {
      console.error('Error editing point title:', error);
      alert('Gagal mengubah nama titik');
    } finally {
      setIsEditPointLoading(false);
    }
  };
  const roomLatitude = normalizeNumber(latitude);
  const roomLongitude = normalizeNumber(longitude);
  const studentLatitude = normalizeNumber(studentPosition?.latitude);
  const studentLongitude = normalizeNumber(studentPosition?.longitude);
  const hasExplicitRoomCenter = roomLatitude !== null && roomLongitude !== null;
  const studentCenter: [number, number] | null =
    studentLatitude !== null && studentLongitude !== null ? [studentLatitude, studentLongitude] : null;
  const roomMarkerPoints = (roomPoints ?? []).reduce<Array<RoomMapPoint & { latitude: number; longitude: number }>>(
    (accumulator, point) => {
      const pointLatitude = normalizeNumber(point.latitude);
      const pointLongitude = normalizeNumber(point.longitude);

      if (pointLatitude === null || pointLongitude === null) {
        return accumulator;
      }

      accumulator.push({
        ...point,
        latitude: pointLatitude,
        longitude: pointLongitude,
        items: point.items ?? [],
      });

      return accumulator;
    },
    []
  );
  const roomCenter: [number, number] | null =
    hasExplicitRoomCenter
      ? [roomLatitude, roomLongitude]
      : roomMarkerPoints[0]
      ? [roomMarkerPoints[0].latitude, roomMarkerPoints[0].longitude]
      : null;
  const activeCenter = roomCenter || studentCenter || DEFAULT_CENTER;
  const activeZoom = roomMarkerPoints.length > 0 ? 14 : roomCenter ? 18 : studentCenter ? 16 : DEFAULT_ZOOM;
  const activeRadius = Math.max(1, normalizeNumber(radiusMeters) ?? 50);
  const activePoints = roomMarkerPoints.map((point) => [point.latitude as number, point.longitude as number] as [number, number]);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
      style={{ height }}
    >
      <LeafletMapContainer
        center={activeCenter}
        zoom={activeZoom}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <LeafletTileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {roomMarkerPoints.length > 0 ? <FitPoints points={activePoints} /> : <RecenterMap center={activeCenter} />}
        <MapClickHandler editable={editable} onSelectLocation={onSelectLocation} />

        {roomMarkerPoints.map((point) => {
          const markerColor = '#4f46e5';
          const roomItems = point.items ?? [];
          const pointRadius = Math.max(1, normalizeNumber(point.radiusMeters) ?? activeRadius);
          const roomNames = point.roomNames ?? (point.location ? [point.location] : []);

          return (
            <Fragment key={point.id}>
              <LeafletCircle
                center={[point.latitude as number, point.longitude as number]}
                radius={pointRadius}
                pathOptions={{
                  color: markerColor,
                  fillColor: '#818cf8',
                  fillOpacity: 0.14,
                  weight: 2,
                }}
              />
              <LeafletCircleMarker
                center={[point.latitude as number, point.longitude as number]}
                radius={11}
                eventHandlers={
                  editable && onSelectLocation
                    ? {
                        click: () => {
                          onSelectLocation({
                            latitude: point.latitude as number,
                            longitude: point.longitude as number,
                          });
                        },
                      }
                    : undefined
                }
                pathOptions={{
                  color: '#ffffff',
                  fillColor: markerColor,
                  fillOpacity: 1,
                  weight: 2,
                }}
              >
                <LeafletPopup>
                  <div className="min-w-[260px] max-w-[320px]">
                    <div className="flex items-center justify-between gap-2 group">
                      <p className="text-sm font-semibold text-slate-900 flex-1">{point.title}</p>
                      {onEditPointTitle && (
                        <button
                          onClick={() => handleEditPointTitle(point.latitude as number, point.longitude as number, point.title)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit nama titik"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">Radius titik: {Math.round(pointRadius)} m</p>
                    {editable && (
                      <p className="mt-0.5 text-xs text-indigo-600">
                        Klik titik ini untuk memakai koordinat yang sama.
                      </p>
                    )}
                    <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-1">
                      {roomItems.length > 0 ? (
                        (() => {
                          const activeItems = roomItems.filter((item) => item.status === 'active');
                          const inactiveItems = roomItems.filter((item) => item.status !== 'active');

                          return (
                            <>
                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                  Sedang aktif ({activeItems.length})
                                </p>
                                <div className="space-y-2">
                                  {activeItems.length > 0 ? (
                                    activeItems.map((item) => (
                                      <div key={item.id} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                                        <div className="flex items-start justify-between gap-3">
                                          <p className="text-sm font-medium text-slate-900">{item.title}</p>
                                          <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                            Aktif
                                          </span>
                                        </div>
                                        {item.subtitle && <p className="mt-0.5 text-xs text-slate-500">{item.subtitle}</p>}
                                        <p className="mt-1 text-[11px] text-emerald-700">Sesuai jadwal saat ini.</p>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="rounded-lg border border-dashed border-emerald-200 bg-white px-3 py-3 text-sm text-slate-500">
                                      Tidak ada kelas aktif di titik ini.
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                                  Tidak aktif ({inactiveItems.length})
                                </p>
                                <div className="space-y-2">
                                  {inactiveItems.length > 0 ? (
                                    inactiveItems.map((item) => (
                                        <div key={item.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                                          <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-medium text-slate-900">{item.title}</p>
                                            <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                              Tidak aktif
                                            </span>
                                          </div>
                                        {item.subtitle && <p className="mt-0.5 text-xs text-slate-500">{item.subtitle}</p>}
                                          <p className="mt-1 text-[11px] text-red-700">Di luar jadwal saat ini.</p>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="rounded-lg border border-dashed border-red-200 bg-white px-3 py-3 text-sm text-slate-500">
                                      Tidak ada kelas nonaktif di titik ini.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          );
                        })()
                      ) : roomNames.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                            Ruangan pada titik ini ({roomNames.length})
                          </p>
                          <div className="space-y-2">
                            {(point.rooms || []).map((room) => (
                              <div key={room.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2 group">
                                <p className="text-sm font-medium text-slate-900 flex-1">{room.name}</p>
                                {onEditRoom && (
                                  <button
                                    onClick={() => handleEditRoom(room.id, room.name)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                    title="Edit nama ruangan"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                          Belum ada kelas yang menggunakan titik ini.
                        </div>
                      )}
                    </div>
                  </div>
                </LeafletPopup>
              </LeafletCircleMarker>
            </Fragment>
          );
        })}

        {hasExplicitRoomCenter && roomCenter && (
          <>
            <LeafletCircleMarker
              center={roomCenter}
              radius={8}
              pathOptions={{
                color: '#ffffff',
                fillColor: '#111827',
                fillOpacity: 1,
                weight: 2,
              }}
            />
          </>
        )}

        {studentCenter && (
          <LeafletCircleMarker
            center={studentCenter}
            radius={7}
            pathOptions={{
              color: '#ffffff',
              fillColor: '#0284c7',
              fillOpacity: 1,
              weight: 2,
            }}
          />
        )}
      </LeafletMapContainer>

      {editingRoomId !== null && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-2xl">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Edit Nama Ruangan</h3>
              <button
                onClick={() => setEditingRoomId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={editingRoomName}
              onChange={(e) => setEditingRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="Nama ruangan"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setEditingRoomId(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveRoomName}
                disabled={isEditLoading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditLoading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPointCoords !== null && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-2xl">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Edit Nama Titik</h3>
              <button
                onClick={() => setEditingPointCoords(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={editingPointTitle}
              onChange={(e) => setEditingPointTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="Nama titik area"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setEditingPointCoords(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSavePointTitle}
                disabled={isEditPointLoading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditPointLoading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};