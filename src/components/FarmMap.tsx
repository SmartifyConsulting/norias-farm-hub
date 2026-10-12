import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import type * as Leaflet from "leaflet";
import { MINI_APPS, read, useRecords, useSettings } from "@/lib/farm";
import {
  guessIcon,
  ICON_KEYS,
  ICONS,
  isLightIcon,
  useBoundary,
  usePins,
  type DistributiveOmit,
  type IconKey,
  type LatLng,
  type MapPin,
} from "@/lib/farmmap";
import { MapPin as MapPinIcon, Redo2, Search, Undo2, X } from "lucide-react";

type GeoResult = {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
};
type Snapshot = { boundary: LatLng[]; pins: MapPin[] };

/** Interactive farm boundary + pinned-record map. Leaflet is browser-only, so everything here runs client-side after mount. */
export function FarmMap({ farmId }: { farmId: string | null }) {
  const [settings] = useSettings();
  const [boundary, setBoundaryState] = useBoundary(farmId);
  const [pins, setPinsState] = usePins(farmId);
  const { records: assets } = useRecords("farm");
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

  // Undo/redo over the combined {boundary, pins} state.
  const historyRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const boundaryRef = useRef(boundary);
  boundaryRef.current = boundary;
  const pinsRef = useRef(pins);
  pinsRef.current = pins;

  const redrawBoundaryLayer = async (latlngs: LatLng[]) => {
    const L = (await import("leaflet")).default;
    const drawn = drawnItems.current;
    if (!drawn) return;
    drawn.clearLayers();
    if (latlngs.length > 0) drawn.addLayer(L.polygon(latlngs));
  };

  const commit = (next: Partial<Snapshot>) => {
    historyRef.current = [
      ...historyRef.current,
      { boundary: boundaryRef.current, pins: pinsRef.current },
    ].slice(-30);
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
    if (next.boundary) setBoundaryState(next.boundary);
    if (next.pins) setPinsState(next.pins);
  };

  const undo = () => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current = [
      ...futureRef.current,
      { boundary: boundaryRef.current, pins: pinsRef.current },
    ];
    setBoundaryState(prev.boundary);
    setPinsState(prev.pins);
    void redrawBoundaryLayer(prev.boundary);
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(true);
  };
  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current = [
      ...historyRef.current,
      { boundary: boundaryRef.current, pins: pinsRef.current },
    ];
    setBoundaryState(next.boundary);
    setPinsState(next.pins);
    void redrawBoundaryLayer(next.boundary);
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
  };

  useEffect(() => {
    let destroyed = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet-draw");
      if (destroyed || !mapRef.current || leafletMap.current) return;

      const center: [number, number] =
        boundaryRef.current.length > 0 ? boundaryRef.current[0]! : [settings.lat, settings.lon];
      const map = L.map(mapRef.current).setView(center, boundaryRef.current.length > 0 ? 15 : 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const drawn = new L.FeatureGroup();
      map.addLayer(drawn);
      drawnItems.current = drawn;
      if (boundaryRef.current.length > 0) drawn.addLayer(L.polygon(boundaryRef.current));

      const markers = L.layerGroup().addTo(map);
      markersLayer.current = markers;

      const drawControl = new L.Control.Draw({
        edit: { featureGroup: drawn, remove: true },
        draw: {
          rectangle: { shapeOptions: { color: "#2a7a4b" } },
          polygon: { shapeOptions: { color: "#2a7a4b" } },
          polyline: false,
          circle: false,
          circlemarker: false,
          marker: false,
        },
      });
      map.addControl(drawControl);

      const boundaryFromLayer = (): LatLng[] => {
        const layers = drawn.getLayers() as Leaflet.Polygon[];
        const poly = layers[0];
        if (!poly) return [];
        return (poly.getLatLngs()[0] as Leaflet.LatLng[]).map((p) => [p.lat, p.lng] as LatLng);
      };

      map.on(L.Draw.Event.CREATED, (e: Leaflet.LeafletEvent) => {
        const { layer, layerType } = e as unknown as { layer: Leaflet.Layer; layerType: string };
        drawn.clearLayers();
        if (layerType === "rectangle") {
          const corners = (layer as Leaflet.Rectangle).getLatLngs()[0] as Leaflet.LatLng[];
          drawn.addLayer(L.polygon(corners.map((c) => [c.lat, c.lng])));
        } else {
          drawn.addLayer(layer);
        }
        commit({ boundary: boundaryFromLayer() });
      });
      map.on(L.Draw.Event.EDITED, () => commit({ boundary: boundaryFromLayer() }));
      map.on(L.Draw.Event.DELETED, () => commit({ boundary: boundaryFromLayer() }));

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

  // Redraw pin/annotation markers whenever the list changes. Clicking a marker opens a popup with
  // a Delete button, so any object (water, shed, a pinned animal, …) can be removed from the map.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !markersLayer.current) return;
      markersLayer.current.clearLayers();
      for (const p of pins) {
        const iconKey = p.kind === "annotation" ? p.icon : (p.icon ?? "package");
        const emoji = ICONS[iconKey] ?? "📍";
        const light = isLightIcon(iconKey);
        const html = light
          ? `<div style="background:#bfe3c0;color:#1a3a20;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.2);border:1px solid #8fcf93">${emoji} ${escapeHtml(p.label)}</div>`
          : `<div style="background:#111;color:#fff;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">${emoji} ${escapeHtml(p.label)}</div>`;
        const icon = L.divIcon({ className: "", html, iconSize: [0, 0] });
        const marker = L.marker([p.lat, p.lon], { icon }).addTo(markersLayer.current!);
        const delId = `del-${p.id}`;
        marker.bindPopup(
          `<div style="font-size:13px"><b>${escapeHtml(p.label)}</b><br/><button id="${delId}" style="margin-top:6px;color:#b91c1c;font-weight:600;font-size:12px;cursor:pointer;border:none;background:none;padding:0">Delete</button></div>`,
        );
        marker.on("popupopen", () => {
          const btn = document.getElementById(delId);
          if (btn)
            btn.onclick = () => {
              commit({ pins: pinsRef.current.filter((x) => x.id !== p.id) });
              leafletMap.current?.closePopup();
            };
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      icon: guessIcon(record.title),
    };
    commit({ pins: [...pins, pin] });
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

  const placePin = (
    lat: number,
    lon: number,
    pin: DistributiveOmit<MapPin, "id" | "lat" | "lon">,
  ) => {
    commit({ pins: [...pinsRef.current, { ...pin, id: crypto.randomUUID(), lat, lon } as MapPin] });
  };

  const dropOnMap = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!leafletMap.current || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const latlng = leafletMap.current.containerPointToLatLng({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    } as Leaflet.Point);

    const annotationKey = e.dataTransfer.getData("text/annotation");
    if (annotationKey) {
      placePin(latlng.lat, latlng.lng, {
        label: ICON_LABELS[annotationKey as IconKey] ?? annotationKey,
        kind: "annotation",
        icon: annotationKey as IconKey,
      });
      return;
    }
    const assetId = e.dataTransfer.getData("text/asset-record");
    if (assetId) {
      const record = assets.find((r) => r.id === assetId);
      if (record)
        placePin(latlng.lat, latlng.lng, {
          label: record.title,
          kind: "record",
          objectApp: "farm",
          objectId: assetId,
          icon: guessIcon(record.title),
        });
      return;
    }
    const customLabel = e.dataTransfer.getData("text/custom-label");
    const customIcon = e.dataTransfer.getData("text/custom-icon") as IconKey;
    if (customLabel && customIcon) {
      placePin(latlng.lat, latlng.lng, {
        label: customLabel,
        kind: "annotation",
        icon: customIcon,
      });
    }
  };

  // Objects you've already added as Assets get an auto-guessed icon and show up here as quick
  // drag-to-map chips, so farmers don't have to re-describe equipment they've already recorded.
  const assetChips = useMemo(
    () => assets.slice(0, 12).map((a) => ({ ...a, icon: guessIcon(a.title) })),
    [assets],
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLabel, setPickerLabel] = useState("");
  const [pickerIcon, setPickerIcon] = useState<IconKey>("package");

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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Draw a rectangle or polygon, top-left — drag its corners or use the edit tool's midpoint
          handles to add more nodes. Drag an icon onto the map, or click a pin to delete it.
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            className="rounded-full border p-1.5 disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            className="rounded-full border p-1.5 disabled:opacity-40"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlacing((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${placing ? "bg-primary text-primary-foreground" : "border"}`}
          >
            <MapPinIcon className="mr-1 inline h-3.5 w-3.5" />
            {placing ? "Click the map to place" : "Pin a record"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border bg-card p-2">
        {ICON_KEYS.slice(0, 5).map((k) => (
          <div
            key={k}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/annotation", k)}
            className={`flex cursor-grab items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold active:cursor-grabbing ${isLightIcon(k) ? "bg-[#bfe3c0] text-[#1a3a20]" : "bg-secondary text-secondary-foreground"}`}
            title={`Drag onto the map to place: ${ICON_LABELS[k]}`}
          >
            <span>{ICONS[k]}</span>
            {ICON_LABELS[k]}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="rounded-full border border-dashed px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          + Add object
        </button>
      </div>

      {assetChips.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-2xl border bg-card p-2">
          <span className="self-center pl-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your assets
          </span>
          {assetChips.map((a) => (
            <div
              key={a.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/asset-record", a.id)}
              className="flex cursor-grab items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground active:cursor-grabbing"
              title={`Drag onto the map to place: ${a.title}`}
            >
              <span>{ICONS[a.icon]}</span>
              {a.title}
            </div>
          ))}
        </div>
      )}

      {pickerOpen && (
        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold">Add an object</p>
            <button type="button" aria-label="Cancel" onClick={() => setPickerOpen(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <input
            className="mb-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Label (e.g. Borehole, Windbreak)"
            value={pickerLabel}
            onChange={(e) => setPickerLabel(e.target.value)}
          />
          <div className="mb-3 flex flex-wrap gap-2">
            {ICON_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setPickerIcon(k)}
                className={`rounded-xl border p-2 text-lg ${pickerIcon === k ? "border-primary ring-2 ring-primary" : ""}`}
                aria-label={ICON_LABELS[k]}
                title={ICON_LABELS[k]}
              >
                {ICONS[k]}
              </button>
            ))}
          </div>
          <div
            draggable={!!pickerLabel.trim()}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/custom-label", pickerLabel.trim());
              e.dataTransfer.setData("text/custom-icon", pickerIcon);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${pickerLabel.trim() ? "cursor-grab bg-secondary text-secondary-foreground active:cursor-grabbing" : "cursor-not-allowed bg-muted text-muted-foreground"}`}
          >
            <span>{ICONS[pickerIcon]}</span>
            {pickerLabel.trim() || "Enter a label, then drag me onto the map"}
          </div>
        </div>
      )}

      <div
        ref={mapRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={dropOnMap}
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
                <span>{ICONS[p.kind === "annotation" ? p.icon : (p.icon ?? "package")]}</span>
                {p.label}
              </span>
              <button
                type="button"
                aria-label="Remove pin"
                onClick={() => commit({ pins: pins.filter((x) => x.id !== p.id) })}
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

const ICON_LABELS: Record<string, string> = {
  home: "Farmhouse",
  warehouse: "Shed",
  droplet: "Water",
  fence: "Gate",
  sprout: "Crop area",
  "tree-pine": "Trees",
  package: "Equipment",
  flame: "Fuel/fire",
  sun: "Sun exposure",
  tractor: "Tractor",
  container: "Silo",
  wheat: "Crop",
  wrench: "Tools",
  fuel: "Fuel point",
  zap: "Power",
  trees: "Woodland",
};

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
