import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import type * as Leaflet from "leaflet";
import { MINI_APPS, read, useSettings } from "@/lib/farm";
import { useBoundary, usePins, type AnnotationIcon, type LatLng, type MapPin } from "@/lib/farmmap";
import { MapPin as MapPinIcon, Search, X } from "lucide-react";

const ANNOTATIONS: { key: AnnotationIcon; emoji: string; label: string; light?: boolean }[] = [
  { key: "farmhouse", emoji: "🏠", label: "Farmhouse" },
  { key: "shed", emoji: "🏚️", label: "Shed" },
  { key: "water", emoji: "💧", label: "Water" },
  { key: "gate", emoji: "🚧", label: "Gate" },
  { key: "crop", emoji: "🌱", label: "Crop area", light: true },
];

type GeoResult = {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

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
          // Start quick with a rectangle; once drawn it's converted to a regular polygon below so
          // nodes can be dragged freely and new ones added via the edit toolbar's midpoint handles.
          rectangle: { shapeOptions: { color: "#2a7a4b" } },
          polygon: { shapeOptions: { color: "#2a7a4b" } },
          polyline: false,
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
        const { layer, layerType } = e as unknown as { layer: Leaflet.Layer; layerType: string };
        // Only one boundary shape at a time. A rectangle becomes a plain polygon immediately so its
        // corners can be dragged into any shape and new nodes added — same editing as a drawn polygon.
        drawn.clearLayers();
        if (layerType === "rectangle") {
          const corners = (layer as Leaflet.Rectangle).getLatLngs()[0] as Leaflet.LatLng[];
          drawn.addLayer(L.polygon(corners.map((c) => [c.lat, c.lng])));
        } else {
          drawn.addLayer(layer);
        }
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

  // Redraw pin/annotation markers whenever the list changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !markersLayer.current) return;
      markersLayer.current.clearLayers();
      for (const p of pins) {
        const isCrop = p.kind === "annotation" && p.icon === "crop";
        const emoji =
          p.kind === "annotation"
            ? (ANNOTATIONS.find((a) => a.key === p.icon)?.emoji ?? "📍")
            : "📍";
        const html = isCrop
          ? `<div style="background:#bfe3c0;color:#1a3a20;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.2);border:1px solid #8fcf93">${emoji} ${escapeHtml(p.label)}</div>`
          : `<div style="background:#111;color:#fff;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">${emoji} ${escapeHtml(p.label)}</div>`;
        const icon = L.divIcon({ className: "", html, iconSize: [0, 0] });
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
      kind: "record",
      objectApp,
      objectId,
    };
    setPins([...pins, pin]);
    setPendingLatLng(null);
    setObjectId("");
    setPlacing(false);
  };

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&name=${encodeURIComponent(query.trim())}`,
      );
      const data = await r.json();
      setResults(data?.results ?? []);
    } catch {
      setResults([]);
    }
    setSearching(false);
  };
  const goTo = (r: GeoResult) => {
    leafletMap.current?.setView([r.latitude, r.longitude], 16);
    setResults([]);
    setQuery(`${r.name}${r.admin1 ? `, ${r.admin1}` : ""}`);
  };

  const dropAnnotation = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const key = e.dataTransfer.getData("text/annotation") as AnnotationIcon;
    const def = ANNOTATIONS.find((a) => a.key === key);
    if (!def || !leafletMap.current || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const point: Leaflet.Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    } as Leaflet.Point;
    const latlng = leafletMap.current.containerPointToLatLng(point);
    const pin: MapPin = {
      id: crypto.randomUUID(),
      lat: latlng.lat,
      lon: latlng.lng,
      label: def.label,
      kind: "annotation",
      icon: def.key,
    };
    setPins([...pins, pin]);
  };

  return (
    <div className="space-y-2">
      <form onSubmit={runSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search a place to jump the map there…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {results.length > 0 && (
            <ul className="absolute z-[1000] mt-1 w-full rounded-xl border bg-card shadow-lg">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => goTo(r)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {r.name}
                    <span className="text-muted-foreground">
                      {[r.admin1, r.country].filter(Boolean).length
                        ? `, ${[r.admin1, r.country].filter(Boolean).join(", ")}`
                        : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          className="shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          disabled={searching}
        >
          {searching ? "…" : "Go"}
        </button>
      </form>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Draw a rectangle or polygon, top-left — drag its corners or use the edit tool's midpoint
          handles to add more nodes. Drag an icon onto the map to annotate it.
        </p>
        <button
          type="button"
          onClick={() => setPlacing((v) => !v)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${placing ? "bg-primary text-primary-foreground" : "border"}`}
        >
          <MapPinIcon className="mr-1 inline h-3.5 w-3.5" />
          {placing ? "Click the map to place a pin" : "Pin a record"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border bg-card p-2">
        {ANNOTATIONS.map((a) => (
          <div
            key={a.key}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/annotation", a.key)}
            className={`flex cursor-grab items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold active:cursor-grabbing ${a.light ? "bg-[#bfe3c0] text-[#1a3a20]" : "bg-secondary text-secondary-foreground"}`}
            title={`Drag onto the map to place: ${a.label}`}
          >
            <span>{a.emoji}</span>
            {a.label}
          </div>
        ))}
      </div>

      <div
        ref={mapRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={dropAnnotation}
        className="h-80 w-full overflow-hidden rounded-2xl border md:h-96"
      />
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
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
