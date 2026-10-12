import { useEffect, useState, useCallback } from "react";
import { APP_REGISTRY, CATEGORIES, type CategoryId } from "@/lib/app-registry";

export type Folder = { id: string; name: string; appIds: string[] };
/** Top-level entries: a folder, or an app not (yet) placed in any folder. One level of folders only — folders never contain folders. */
export type TopEntry = { kind: "folder"; id: string } | { kind: "app"; id: string };
/** `knownIds` is every app id this layout has ever seen placed somewhere (or deliberately
 * removed). It's how reconcile() tells "a new app was added to the registry since last save, put
 * it somewhere visible" apart from "the user removed this app on purpose, leave it removed". */
export type Layout = { folders: Folder[]; order: TopEntry[]; knownIds?: string[] | undefined };

const STORAGE_KEY = "farmerplus:layout";
const EVENT = "farmerplus:layout-change";

/** New users start with just My Farm visible — everything else still exists (in the App Store)
 * and can be added back from Explore More Apps. A category is only used to group apps for
 * browsing there; it's never used to auto-create or auto-fill a folder — folders in Your Apps
 * are always ones the user made themselves (by dragging apps together or "New folder"). */
const DEFAULT_VISIBLE: CategoryId[] = ["my-farm"];

function defaultLayout(): Layout {
  const order: TopEntry[] = APP_REGISTRY.filter((a) => DEFAULT_VISIBLE.includes(a.category)).map(
    (a) => ({ kind: "app", id: a.id }),
  );
  return { folders: [], order, knownIds: APP_REGISTRY.map((a) => a.id) };
}

function reconcile(layout: Layout): Layout {
  const known = new Set(APP_REGISTRY.map((a) => a.id));
  const categoryIds = new Set(CATEGORIES.map((c) => c.id as string));
  // A folder id that isn't a user-created id (those are "folder-<timestamp>-<n>") and no longer
  // matches a current category was a predefined category that's since been removed — release its
  // apps back to the top level rather than leaving an orphaned folder around forever.
  const isRemovedCategory = (id: string) => !id.startsWith("folder-") && !categoryIds.has(id);

  const placed = new Set<string>();
  const folders = layout.folders
    .filter((f) => !isRemovedCategory(f.id))
    .map((f) => ({ ...f, appIds: f.appIds.filter((id) => known.has(id)) }));
  for (const f of folders) for (const id of f.appIds) placed.add(id);

  const released: TopEntry[] = layout.folders
    .filter((f) => isRemovedCategory(f.id))
    .flatMap((f) =>
      f.appIds
        .filter((id) => known.has(id) && !placed.has(id))
        .map((id): TopEntry => ({ kind: "app", id })),
    );
  for (const e of released) if (e.kind === "app") placed.add(e.id);

  let order = [
    ...layout.order.filter((e) =>
      e.kind === "folder"
        ? folders.some((f) => f.id === e.id)
        : known.has(e.id) && !placed.has(e.id),
    ),
    ...released,
  ];
  for (const e of order) if (e.kind === "app") placed.add(e.id);

  // Only an app that's genuinely new to the registry (never seen before in this layout) gets
  // auto-added, unsorted, at the top level. An app the user deliberately removed (it's in
  // knownIds but not placed) stays removed — it's still discoverable from Explore More Apps.
  const knownIds = new Set(layout.knownIds ?? placed);
  const missing = APP_REGISTRY.filter((a) => !placed.has(a.id) && !knownIds.has(a.id)).map(
    (a) => a.id,
  );
  order = [...order, ...missing.map((id): TopEntry => ({ kind: "app", id }))];

  return { folders, order, knownIds: Array.from(new Set([...knownIds, ...known])) };
}

function load(): Layout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLayout();
    return reconcile(JSON.parse(raw));
  } catch {
    return defaultLayout();
  }
}

function persist(layout: Layout) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  window.dispatchEvent(new Event(EVENT));
}

let genId = 0;
function newFolderId() {
  genId += 1;
  return `folder-${Date.now()}-${genId}`;
}

export function useLayout() {
  const [layout, setLayout] = useState<Layout>(defaultLayout());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => setLayout(load());
    refresh();
    setReady(true);
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const save = useCallback(
    (next: Layout) => {
      // Every mutator below builds `next` from scratch without necessarily carrying `knownIds`
      // forward — preserve it here so a plain moveApp/reorder etc. never silently drops the record
      // of which apps have already been seen (that record is what keeps a removed app removed).
      const withKnown: Layout = { ...next, knownIds: next.knownIds ?? layout.knownIds };
      setLayout(withKnown);
      persist(withKnown);
    },
    [layout.knownIds],
  );

  const folderOf = useCallback(
    (appId: string) => layout.folders.find((f) => f.appIds.includes(appId))?.id,
    [layout],
  );

  const moveApp = useCallback(
    (appId: string, targetFolderId: string | null, targetIndex?: number) => {
      const folders = layout.folders.map((f) => ({
        ...f,
        appIds: f.appIds.filter((id) => id !== appId),
      }));
      let order = layout.order.filter((e) => !(e.kind === "app" && e.id === appId));

      if (targetFolderId) {
        const fi = folders.findIndex((f) => f.id === targetFolderId);
        const target = folders[fi];
        if (fi >= 0 && target) {
          const appIds = [...target.appIds];
          const idx = targetIndex ?? appIds.length;
          appIds.splice(Math.max(0, Math.min(idx, appIds.length)), 0, appId);
          folders[fi] = { ...target, appIds };
        }
      } else {
        const idx = targetIndex ?? order.length;
        order = [...order];
        order.splice(Math.max(0, Math.min(idx, order.length)), 0, { kind: "app", id: appId });
      }
      save({ folders, order });
    },
    [layout, save],
  );

  /** Drag one top-level app onto another top-level app: creates a new folder containing both. */
  const groupIntoNewFolder = useCallback(
    (draggedAppId: string, targetAppId: string, name = "New Folder") => {
      if (draggedAppId === targetAppId) return;
      const folderId = newFolderId();
      const folder: Folder = { id: folderId, name, appIds: [targetAppId, draggedAppId] };
      const order = layout.order
        .filter((e) => !(e.kind === "app" && (e.id === draggedAppId || e.id === targetAppId)))
        .map((e) => e);
      const targetIdx = layout.order.findIndex((e) => e.kind === "app" && e.id === targetAppId);
      const insertAt = targetIdx >= 0 ? Math.min(targetIdx, order.length) : order.length;
      order.splice(insertAt, 0, { kind: "folder", id: folderId });
      save({ folders: [...layout.folders, folder], order });
    },
    [layout, save],
  );

  const reorderTop = useCallback((order: TopEntry[]) => save({ ...layout, order }), [layout, save]);

  const reorderInFolder = useCallback(
    (folderId: string, appIds: string[]) =>
      save({
        ...layout,
        folders: layout.folders.map((f) => (f.id === folderId ? { ...f, appIds } : f)),
      }),
    [layout, save],
  );

  /** Fully removes an app from "Your Apps" (top level or any folder) — it stays in the App
   * Store and can be added back with "+ Add" from Explore More Apps. */
  const removeApp = useCallback(
    (appId: string) => {
      save({
        folders: layout.folders.map((f) => ({
          ...f,
          appIds: f.appIds.filter((id) => id !== appId),
        })),
        order: layout.order.filter((e) => !(e.kind === "app" && e.id === appId)),
      });
    },
    [layout, save],
  );

  const showFolder = useCallback(
    (folderId: string) => {
      if (layout.order.some((e) => e.kind === "folder" && e.id === folderId)) return;
      save({ ...layout, order: [...layout.order, { kind: "folder", id: folderId }] });
    },
    [layout, save],
  );

  const createFolder = useCallback(
    (name: string) => {
      const folder: Folder = { id: newFolderId(), name: name.trim() || "New Folder", appIds: [] };
      save({
        folders: [...layout.folders, folder],
        order: [...layout.order, { kind: "folder", id: folder.id }],
      });
      return folder.id;
    },
    [layout, save],
  );

  const renameFolder = useCallback(
    (folderId: string, name: string) =>
      save({
        ...layout,
        folders: layout.folders.map((f) =>
          f.id === folderId ? { ...f, name: name.trim() || f.name } : f,
        ),
      }),
    [layout, save],
  );

  const deleteFolder = useCallback(
    (folderId: string) => {
      const folder = layout.folders.find((f) => f.id === folderId);
      if (!folder) return;
      const folders = layout.folders.filter((f) => f.id !== folderId);
      const idx = layout.order.findIndex((e) => e.kind === "folder" && e.id === folderId);
      const order = layout.order.filter((e) => !(e.kind === "folder" && e.id === folderId));
      const releasedApps = folder.appIds.map((id): TopEntry => ({ kind: "app", id }));
      order.splice(idx >= 0 ? idx : order.length, 0, ...releasedApps);
      save({ folders, order });
    },
    [layout, save],
  );

  return {
    layout,
    ready,
    folderOf,
    moveApp,
    removeApp,
    groupIntoNewFolder,
    reorderTop,
    reorderInFolder,
    showFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    resetToDefault: () => save(defaultLayout()),
  };
}

export function categoryMeta(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id);
}
