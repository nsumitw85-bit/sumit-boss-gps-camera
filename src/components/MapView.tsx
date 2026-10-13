import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapViewProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  interactive?: boolean;
  className?: string;
  markers?: Array<{
    latitude: number;
    longitude: number;
    title: string;
    description?: string;
  }>;
}

export const MapView: React.FC<MapViewProps> = ({
  latitude,
  longitude,
  accuracy,
  interactive = true,
  className = 'h-64 w-full rounded-xl',
  markers = [],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Fix Leaflet default icon paths in bundler environments
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const initialLat = latitude && !isNaN(latitude) ? latitude : 19.076; // Default to Mumbai/Maharashtra
      const initialLng = longitude && !isNaN(longitude) ? longitude : 72.8777;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: interactive,
        dragging: interactive,
        touchZoom: interactive,
        scrollWheelZoom: interactive,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
      map.setView([latitude, longitude], map.getZoom());

      // Update or create main GPS marker
      if (!markerRef.current) {
        markerRef.current = L.marker([latitude, longitude]).addTo(map);
        markerRef.current.bindPopup(`<b>Current GPS Fix</b><br/>Lat: ${latitude.toFixed(6)}<br/>Lng: ${longitude.toFixed(6)}`);
      } else {
        markerRef.current.setLatLng([latitude, longitude]);
        markerRef.current.setPopupContent(`<b>Current GPS Fix</b><br/>Lat: ${latitude.toFixed(6)}<br/>Lng: ${longitude.toFixed(6)}`);
      }

      // Accuracy circle
      if (accuracy && accuracy > 0) {
        if (!circleRef.current) {
          circleRef.current = L.circle([latitude, longitude], {
            radius: accuracy,
            color: '#3b82f6',
            fillColor: '#60a5fa',
            fillOpacity: 0.15,
            weight: 1.5,
          }).addTo(map);
        } else {
          circleRef.current.setLatLng([latitude, longitude]);
          circleRef.current.setRadius(accuracy);
        }
      }
    }

    // Additional markers (e.g. for Photo History)
    if (markers.length > 0) {
      markers.forEach((m) => {
        const marker = L.marker([m.latitude, m.longitude]).addTo(map);
        marker.bindPopup(`<b>${m.title}</b><br/>${m.description || ''}`);
      });
    }

    // Ensure map tiles render properly after container size calculation
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      // Keep map instance or clean up on unmount
    };
  }, [latitude, longitude, accuracy, markers, interactive]);

  // Clean up on component unmount
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
      <div className="absolute top-2 right-2 z-[400] bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded text-[11px] font-mono text-slate-300 border border-slate-700/80 shadow">
        {latitude && longitude ? `${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°` : 'Searching GPS...'}
      </div>
    </div>
  );
};
