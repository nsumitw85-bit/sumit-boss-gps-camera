import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export interface MapMarkerItem {
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface MapPolygonItem {
  id: string;
  name: string;
  coordinates: number[][][]; // GeoJSON [lng, lat]
  color?: string;
  fillOpacity?: number;
}

interface MapViewProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  interactive?: boolean;
  className?: string;
  markers?: MapMarkerItem[];
  polygons?: MapPolygonItem[];
  onPolygonClick?: (polygonId: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  latitude,
  longitude,
  accuracy,
  interactive = true,
  className = 'h-64 w-full rounded-xl',
  markers = [],
  polygons = [],
  onPolygonClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const polygonLayerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const initialLat = latitude && !isNaN(latitude) ? latitude : 20.942315;
      const initialLng = longitude && !isNaN(longitude) ? longitude : 78.073421;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: interactive,
        dragging: interactive,
        touchZoom: interactive,
        scrollWheelZoom: interactive,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | SUMIT BOSS',
        maxZoom: 19,
      }).addTo(map);

      markerLayerGroupRef.current = L.layerGroup().addTo(map);
      polygonLayerGroupRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // 1. User Live GPS Fix & Accuracy
    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([latitude, longitude], {
          title: 'My Location',
          zIndexOffset: 1000,
        }).addTo(map);
        userMarkerRef.current.bindPopup(
          `<div style="font-family: sans-serif; font-size: 12px; color: #0f172a;">
            <b style="color: #2563eb;">📍 Current Live Position</b><br/>
            Lat: ${latitude.toFixed(6)}° N<br/>
            Lng: ${longitude.toFixed(6)}° E<br/>
            Accuracy: ±${accuracy || 0}m
          </div>`
        );
      } else {
        userMarkerRef.current.setLatLng([latitude, longitude]);
        userMarkerRef.current.setPopupContent(
          `<div style="font-family: sans-serif; font-size: 12px; color: #0f172a;">
            <b style="color: #2563eb;">📍 Current Live Position</b><br/>
            Lat: ${latitude.toFixed(6)}° N<br/>
            Lng: ${longitude.toFixed(6)}° E<br/>
            Accuracy: ±${accuracy || 0}m
          </div>`
        );
      }

      if (accuracy && accuracy > 0) {
        if (!userCircleRef.current) {
          userCircleRef.current = L.circle([latitude, longitude], {
            radius: accuracy,
            color: '#3b82f6',
            fillColor: '#60a5fa',
            fillOpacity: 0.2,
            weight: 1.5,
          }).addTo(map);
        } else {
          userCircleRef.current.setLatLng([latitude, longitude]);
          userCircleRef.current.setRadius(accuracy);
        }
      }
    }

    // 2. Ward Boundary Polygons
    if (polygonLayerGroupRef.current) {
      polygonLayerGroupRef.current.clearLayers();

      polygons.forEach((poly) => {
        // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
        const latLngRings = poly.coordinates.map((ring) =>
          ring.map((pt) => [pt[1], pt[0]] as [number, number])
        );

        const leafletPoly = L.polygon(latLngRings, {
          color: poly.color || '#3b82f6',
          weight: 2,
          fillColor: poly.color || '#3b82f6',
          fillOpacity: poly.fillOpacity || 0.18,
        });

        leafletPoly.bindPopup(
          `<div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 140px;">
            <b style="color: #0284c7; font-size: 13px;">🏢 ${poly.id.toUpperCase()}</b><br/>
            <span style="font-weight: 600;">${poly.name}</span><br/>
            <span style="font-size: 10px; color: #64748b;">Tivsa Nagar Panchayat</span>
          </div>`
        );

        if (onPolygonClick) {
          leafletPoly.on('click', () => onPolygonClick(poly.id));
        }

        leafletPoly.addTo(polygonLayerGroupRef.current!);
      });
    }

    // 3. Photo Markers
    if (markerLayerGroupRef.current) {
      markerLayerGroupRef.current.clearLayers();

      markers.forEach((m) => {
        const marker = L.marker([m.latitude, m.longitude]);
        const thumbHtml = m.thumbnailUrl
          ? `<img src="${m.thumbnailUrl}" style="width: 100%; max-height: 110px; object-fit: cover; border-radius: 6px; margin-top: 6px;" alt="Photo" />`
          : '';

        marker.bindPopup(
          `<div style="font-family: sans-serif; font-size: 11px; color: #0f172a; max-width: 220px;">
            <b style="color: #0369a1; font-size: 12px;">📷 ${m.title}</b><br/>
            <div>${m.description || ''}</div>
            ${thumbHtml}
          </div>`
        );

        marker.addTo(markerLayerGroupRef.current!);
      });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [latitude, longitude, accuracy, markers, polygons, interactive]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`relative overflow-hidden border border-slate-700/60 shadow-inner ${className}`}>
      <div ref={mapContainerRef} className="h-full w-full z-0" />
      <div className="absolute top-2 right-2 z-[400] bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded text-[11px] font-mono text-slate-300 border border-slate-700/80 shadow pointer-events-none">
        {latitude && longitude ? `${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°` : 'Fixing GPS...'}
      </div>
    </div>
  );
};
