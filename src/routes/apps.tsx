import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Screen } from "@/components/Dock";
import { AppLink } from "@/components/AppLink";
import {
  APP_REGISTRY,
  CATEGORIES,
  appById,
  searchApps,
  type RegistryApp,
} from "@/lib/app-registry";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLayout, type TopEntry } from "@/lib/layout";
import { useFavourites } from "@/lib/favourites";
import { appTone } from "@/lib/app-colors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderPlus, MoreVertical, Search, Star, X } from "lucide-react";

export const Route = createFileRoute("/apps")({
  validateSearch: (s: Record<string, unknown>) => ({
    folder: typeof s["folder"] === "string" ? (s["folder"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "App Store — FarmerPlus" },
      {
        name: "description",
        content: "Browse FarmerPlus apps, grouped into folders you can organise yourself.",
      },
      { property: "og:title", content: "App Store — FarmerPlus" },
      {
        property: "og:description",
        content: "All the apps you need to run your farm, organised your way.",
      },
    ],
  }),
  component: Apps,
});

function AppTile({ app, dragging }: { app: RegistryApp; dragging?: boolean }) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border bg-card p-4 transition ${dragging ? "opacity-40" : "hover:shadow-md"}`}
    >
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${appTone(app.tone)}`}
      >
        <app.icon className="h-7 w-7" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-card-foreground">{app.name}</p>
        <p className="truncate text-sm text-muted-foreground">{app.blurb}</p>
      </div>
    </div>
  );
}

function DraggableApp({
  app,
  onRemove,
  favourite,
  onToggleFavourite,
}: {
  app: RegistryApp;
  onRemove?: () => void;
  favourite: boolean;
  onToggleFavourite: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `app:${app.id}`,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `app:${app.id}` });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setDropRef}
      className={`relative rounded-2xl ${isOver ? "ring-2 ring-brand-green" : ""}`}
    >
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none active:cursor-grabbing"
      >
        <AppLink
          app={app}
          className="block"
          onClickCapture={(e) => {
            if (isDragging) e.preventDefault();
          }}
        >
          <AppTile app={app} dragging={isDragging} />
        </AppLink>
      </div>
      <button
        type="button"
        aria-label={favourite ? "Remove from favourites" : "Add to favourites"}
        onClick={onToggleFavourite}
        className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-brand-yellow"
      >
        <Star className={`h-4 w-4 ${favourite ? "fill-brand-yellow text-brand-yellow" : ""}`} />
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label="Remove from folder"
          onClick={onRemove}
          className="absolute right-2 bottom-2 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-brand-red"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function FolderTile({
  id,
  name,
  apps,
  onOpen,
  onRename,
  onDelete,
}: {
  id: string;
  name: string;
  apps: RegistryApp[];
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `folder:${id}` });
  const preview = apps.slice(0, 4);
  return (
    <div
      ref={setNodeRef}
      className={`group relative flex items-center gap-4 rounded-2xl border bg-card p-4 transition hover:shadow-md ${isOver ? "ring-2 ring-brand-green" : ""}`}
    >
      <button type="button" onClick={onOpen} className="flex flex-1 items-center gap-4 text-left">
        <span className="grid h-14 w-14 shrink-0 grid-cols-2 gap-0.5 overflow-hidden rounded-2xl bg-muted p-1">
          {preview.length === 0 ? (
            <FolderPlus className="col-span-2 row-span-2 m-auto h-6 w-6 text-muted-foreground" />
          ) : (
            preview.map((a) => (
              <span
                key={a.id}
                className={`flex items-center justify-center rounded-md ${appTone(a.tone)}`}
              >
                <a.icon className="h-3.5 w-3.5" />
              </span>
            ))
          )}
        </span>
        <div className="flex-1">
          <p className="font-semibold text-card-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">
            {apps.length} {apps.length === 1 ? "app" : "apps"}
          </p>
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Folder options"
            className="rounded-full p-1.5 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100 focus:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-brand-red">
            Delete folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Apps() {
  const {
    layout,
    moveApp,
    groupIntoNewFolder,
    showFolder,
    createFolder,
    renameFolder,
    deleteFolder,
  } = useLayout();
  const { ids: favIds, isFavourite, toggle: toggleFavourite } = useFavourites();
  const search = useSearch({ from: "/apps" });
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(search["folder"] ?? null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const results = useMemo(() => searchApps(query), [query]);
  const favourites = useMemo(
    () => favIds.map(appById).filter((a): a is RegistryApp => !!a),
    [favIds],
  );
  const expandedFolder = layout.folders.find((f) => f.id === expanded);

  const dragApp = activeId?.startsWith("app:") ? appById(activeId.slice(4)) : undefined;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith("app:")) return;
    const appId = activeId.slice(4);

    if (overId.startsWith("folder:")) {
      moveApp(appId, overId.slice(7));
      return;
    }
    if (overId.startsWith("app:")) {
      const targetId = overId.slice(4);
      if (expandedFolder) {
        // Reordering within the open folder.
        const ids = expandedFolder.appIds.filter((id) => id !== appId);
        const idx = ids.indexOf(targetId);
        ids.splice(idx < 0 ? ids.length : idx, 0, appId);
        moveApp(appId, expandedFolder.id, ids.indexOf(appId));
        return;
      }
      groupIntoNewFolder(appId, targetId);
    }
  }

  function openFolder(id: string) {
    setExpanded(id);
    nav({ to: "/apps", search: { folder: id } });
  }
  function closeFolder() {
    setExpanded(null);
    nav({ to: "/apps", search: { folder: undefined } });
  }

  return (
    <Screen title="App Store">
      <div className="mb-5 flex items-center gap-2 rounded-full border bg-card px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          aria-label="Search apps"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all apps…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {query ? (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
          {results.length === 0 && (
            <p className="text-sm text-muted-foreground">No apps match "{query}".</p>
          )}
          {results.map((a) => (
            <DraggableApp
              key={a.id}
              app={a}
              favourite={isFavourite(a.id)}
              onToggleFavourite={() => toggleFavourite(a.id)}
            />
          ))}
        </div>
      ) : expandedFolder ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={closeFolder}
              className="text-sm font-semibold text-earth-1"
            >
              ← Your Apps
            </button>
            <h2 className="font-display text-lg font-semibold">{expandedFolder.name}</h2>
            <span />
          </div>
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
              {expandedFolder.appIds.map((id) => {
                const a = appById(id);
                if (!a) return null;
                return (
                  <DraggableApp
                    key={a.id}
                    app={a}
                    favourite={isFavourite(a.id)}
                    onToggleFavourite={() => toggleFavourite(a.id)}
                    onRemove={() => moveApp(a.id, null)}
                  />
                );
              })}
              {expandedFolder.appIds.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No apps in this folder yet — drag one in from "Your Apps".
                </p>
              )}
            </div>
            <DragOverlay>{dragApp && <AppTile app={dragApp} />}</DragOverlay>
          </DndContext>
        </div>
      ) : (
        <div>
          {favourites.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 font-display text-lg font-semibold">Favourites</h2>
              <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
                {favourites.map((a) => (
                  <DraggableApp
                    key={a.id}
                    app={a}
                    favourite
                    onToggleFavourite={() => toggleFavourite(a.id)}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Your Apps</h2>
            <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="mr-1.5 h-4 w-4" /> New folder
            </Button>
          </div>
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
              {layout.order.map((entry: TopEntry) => {
                if (entry.kind === "folder") {
                  const f = layout.folders.find((x) => x.id === entry.id);
                  if (!f) return null;
                  const apps = f.appIds.map(appById).filter((a): a is RegistryApp => !!a);
                  return (
                    <FolderTile
                      key={f.id}
                      id={f.id}
                      name={f.name}
                      apps={apps}
                      onOpen={() => openFolder(f.id)}
                      onRename={() => setRenaming({ id: f.id, name: f.name })}
                      onDelete={() => setDeleting({ id: f.id, name: f.name })}
                    />
                  );
                }
                const a = appById(entry.id);
                if (!a) return null;
                return (
                  <DraggableApp
                    key={a.id}
                    app={a}
                    favourite={isFavourite(a.id)}
                    onToggleFavourite={() => toggleFavourite(a.id)}
                  />
                );
              })}
            </div>
            <DragOverlay>{dragApp && <AppTile app={dragApp} />}</DragOverlay>
          </DndContext>
          <p className="mt-4 text-xs text-muted-foreground">
            Drag an app onto another to make a folder, or onto a folder to add it in. Drag an app
            out of a folder's "×" to move it back here.
          </p>
          {(() => {
            const hidden = layout.folders.filter(
              (f) => !layout.order.some((e) => e.kind === "folder" && e.id === f.id),
            );
            if (hidden.length === 0) return null;
            return (
              <div className="mt-5 border-t pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  More categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {hidden.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => showFolder(f.id)}
                      className="rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-muted"
                    >
                      + {f.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="mt-8 border-t pt-6">
            <h2 className="mb-3 font-display text-lg font-semibold">Explore More Apps</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Every app, grouped by category — browse here regardless of how you've organised "Your
              Apps" above.
            </p>
            <Accordion type="multiple" className="rounded-2xl border bg-card px-4">
              {CATEGORIES.map((c) => {
                const apps = APP_REGISTRY.filter((a) => a.category === c.id);
                return (
                  <AccordionItem key={c.id} value={c.id} className="last:border-b-0">
                    <AccordionTrigger>
                      <span>
                        {c.name}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {apps.length} {apps.length === 1 ? "app" : "apps"}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      {apps.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No apps yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {apps.map((a) => (
                            <AppLink
                              key={a.id}
                              app={a}
                              className="flex items-center gap-3 rounded-xl border bg-background p-3 hover:shadow-sm"
                            >
                              <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${appTone(a.tone)}`}
                              >
                                <a.icon className="h-5 w-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {a.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">{a.blurb}</p>
                              </div>
                            </AppLink>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </div>
      )}

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) =>
              e.key === "Enter" &&
              newFolderName.trim() &&
              (createFolder(newFolderName), setNewFolderName(""), setNewFolderOpen(false))
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newFolderName.trim()) {
                  createFolder(newFolderName);
                  setNewFolderName("");
                  setNewFolderOpen(false);
                }
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>
          {renaming && (
            <Input
              autoFocus
              value={renaming.name}
              onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                renaming.name.trim() &&
                (renameFolder(renaming.id, renaming.name), setRenaming(null))
              }
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renaming && renaming.name.trim()) {
                  renameFolder(renaming.id, renaming.name);
                  setRenaming(null);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{deleting?.name}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Its apps move back to the top level — nothing is removed from the App Store.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleting) {
                  deleteFolder(deleting.id);
                  setDeleting(null);
                  if (expanded === deleting.id) closeFolder();
                }
              }}
            >
              Delete folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}
