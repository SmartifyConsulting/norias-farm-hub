import { useEffect, useState, useCallback } from "react";
import { APP_REGISTRY, CATEGORIES, type CategoryId } from "@/lib/app-registry";

export type Folder = { id: string; name: string; appIds: string[] };
/** Top-level entries: a folder, or an app not (yet) placed in any folder. One level of folders only — folders never contain folders. */
export type TopEntry = { kind: "folder"; id: string } | { kind: "app"; id: string };
export type Layout = { folders: Folder[]; order: TopEntry[] };

const STORAGE_KEY = "farmerplus:layout";
const EVENT = "farmerplus:layout-change";

/** New users start with just My Farm visible — everything else still exists (in `folders`) and can be added back from the App Store. */
const DEFAULT_VISIBLE: CategoryId[] = ["my-farm"];

function defaultLayout(): Layout {
  const folders: Folder[] = CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    appIds: APP_REGISTRY.filter((a) => a.category === c.id).map((a) => a.id),
  }));
  return {
    folders,
    order: folders
      .filter((f) => DEFAULT_VISIBLE.includes(f.id as CategoryId))
      .map((f) => ({ kind: "folder", id: f.id })),
  };
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

  // Any app added to the registry since last save (or missing from both folders and order) lands at the top level, unsorted.
  const missing = APP_REGISTRY.filter((a) => !placed.has(a.id)).map((a) => a.id);
  order = [...order, ...missing.map((id): TopEntry => ({ kind: "app", id }))];

  return { folders, order };
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

  const save = useCallback((next: Layout) => {
    setLayout(next);
    persist(next);
  }, []);

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
