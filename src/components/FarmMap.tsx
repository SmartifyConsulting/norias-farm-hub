import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import type * as Leaflet from "leaflet";
import { MINI_APPS, read, useSettings } from "@/lib/farm";
import { useBoundary, usePins, type LatLng, type MapPin } from "@/lib/farmmap";
import { MapPin as MapPinIcon, X } from "lucide-react";

/** Interactive farm boundary + pinned-record map. Leaflet is browser-only, so everything here runs client-side after mount. */
export function FarmMap({ farmId }: { farmId: string | null }) {
  const [settings] = useSettings();
  const [boundary, setBoundary] = useBoundary(farmId);
  const [pins, setPins] = usePins(farmId);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<Leaflet.Map | null>(null);
  const drawnItems = useRef<Leaflet.FeatureGroup | null>(null);
  const markersLayer = useRef<Leaflet.LayerGroup | null>(null);
  const [placing, setPlacing] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<LatLng | null>(null);
  const [objectApp, setObjectApp] = useState(MINI_APPS[0]?.id ?? "");
  const [objectId, setObjectId] = useState("");
  const placingRef = useRef(placing);
  placingRef.current = placing;

  useEffect(() => {
    let destroyed = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet-draw");
      if (destroyed || !mapRef.current || leafletMap.current) return;

      const center: [number, number] =
        boundary.length > 0 ? boundary[0]! : [settings.lat, settings.lon];
      const map = L.map(mapRef.current).setView(center, boundary.length > 0 ? 15 : 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const drawn = new L.FeatureGroup();
      map.addLayer(drawn);
      drawnItems.current = drawn;
      if (boundary.length > 0) {
        const poly = L.polygon(boundary);
        drawn.addLayer(poly);
      }

      const markers = L.layerGroup().addTo(map);
      markersLayer.current = markers;

      const drawControl = new L.Control.Draw({
        edit: { featureGroup: drawn, remove: true },
        draw: {
          polygon: { shapeOptions: { color: "#2a7a4b" } },
          polyline: false,
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false,
        },
      });
      map.addControl(drawControl);

      const persistBoundary = () => {
        const layers = drawn.getLayers() as Leaflet.Polygon[];
        const poly = layers[0];
        if (!poly) {
          setBoundary([]);
          return;
        }
        const latlngs = (poly.getLatLngs()[0] as Leaflet.LatLng[]).map(
          (p) => [p.lat, p.lng] as LatLng,
        );
        setBoundary(latlngs);
      };

      map.on(L.Draw.Event.CREATED, (e: Leaflet.LeafletEvent) => {
        // Only one boundary polygon at a time.
        drawn.clearLayers();
        drawn.addLayer((e as unknown as { layer: Leaflet.Layer }).layer);
        persistBoundary();
      });
      map.on(L.Draw.Event.EDITED, persistBoundary);
      map.on(L.Draw.Event.DELETED, persistBoundary);

      map.on("click", (e: Leaflet.LeafletMouseEvent) => {
        if (!placingRef.current) return;
        setPendingLatLng([e.latlng.lat, e.latlng.lng]);
      });

      leafletMap.current = map;
    })();
    return () => {
      destroyed = true;
      leafletMap.current?.remove();
      leafletMap.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw pin markers whenever the pin list changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !markersLayer.current) return;
      markersLayer.current.clearLayers();
      for (const p of pins) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:#111;color:#fff;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">📍 ${escapeHtml(p.label)}</div>`,
          iconSize: [0, 0],
        });
        L.marker([p.lat, p.lon], { icon })
          .addTo(markersLayer.current!)
          .bindPopup(`<b>${escapeHtml(p.label)}</b>`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pins]);

  const objectRecords = objectApp ? read(objectApp) : [];
  const confirmPin = () => {
    if (!pendingLatLng || !objectId) return;
    const record = objectRecords.find((r) => r.id === objectId);
    if (!record) return;
    const pin: MapPin = {
      id: crypto.randomUUID(),
      lat: pendingLatLng[0],
      lon: pendingLatLng[1],
      label: record.title,
      objectApp,
      objectId,
    };
    setPins([...pins, pin]);
    setPendingLatLng(null);
    setObjectId("");
    setPlacing(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Draw your farm boundary with the polygon tool, top-left. Pins link to records you've
          already added.
        </p>
        <button
          type="button"
          onClick={() => setPlacing((v) => !v)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${placing ? "bg-primary text-primary-foreground" : "border"}`}
        >
          <MapPinIcon className="mr-1 inline h-3.5 w-3.5" />
          {placing ? "Click the map to place a pin" : "Add pin"}
        </button>
      </div>
      <div ref={mapRef} className="h-80 w-full overflow-hidden rounded-2xl border md:h-96" />
      {pendingLatLng && (
        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold">Pin this location to a record</p>
            <button
              type="button"
              aria-label="Cancel"
              onClick={() => {
                setPendingLatLng(null);
                setObjectId("");
              }}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Record type"
              className="rounded-xl border bg-background px-3 py-2 text-sm"
              value={objectApp}
              onChange={(e) => {
                setObjectApp(e.target.value);
                setObjectId("");
              }}
            >
              {MINI_APPS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Record"
              className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm"
              value={objectId}
              onChange={(e) => setObjectId(e.target.value)}
            >
              <option value="">
                {objectRecords.length ? "Choose a record" : "No records yet in this app"}
              </option>
              {objectRecords.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={confirmPin}
              disabled={!objectId}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Pin it
            </button>
          </div>
        </div>
      )}
      {pins.length > 0 && (
        <ul className="divide-y rounded-2xl border bg-card text-sm">
          {pins.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-2">
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="h-3.5 w-3.5 text-primary" />
                {p.label}
              </span>
              <button
                type="button"
                aria-label="Remove pin"
                onClick={() => setPins(pins.filter((x) => x.id !== p.id))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
