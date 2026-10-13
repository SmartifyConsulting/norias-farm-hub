import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Shape = "banner" | "portrait";

const FRAME: Record<Shape, { w: number; h: number; outW: number; outH: number }> = {
  banner: { w: 320, h: 107, outW: 1200, outH: 400 },
  portrait: { w: 260, h: 325, outW: 1080, outH: 1350 },
};

/** A minimal drag-to-pan, zoom-to-crop picker: the image stays fixed size behind a cropping
 * frame sized to the target aspect ratio, and the user drags/zooms it into place. "Use this
 * crop" renders only the framed region onto a canvas at the recommended output resolution. */
export function ImageCropper({
  file,
  shape,
  onCancel,
  onCropped,
}: {
  file: File;
  shape: Shape;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const frame = FRAME[shape];
  const [src, setSrc] = useState("");
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const imgElRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const coverScale = natural.w > 0 ? Math.max(frame.w / natural.w, frame.h / natural.h) : 1;
  const scale = coverScale * zoom;
  const dispW = natural.w * scale;
  const dispH = natural.h * scale;

  const clamp = (x: number, y: number) => {
    const minX = Math.min(0, frame.w - dispW);
    const minY = Math.min(0, frame.h - dispH);
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
  };

  // Re-clamp whenever zoom or the loaded image size changes, so zooming out never leaves a gap.
  useEffect(() => {
    setOffset((o) => clamp(o.x, o.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, natural.w, natural.h]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset(clamp(dragRef.current.ox + dx, dragRef.current.oy + dy));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const confirm = () => {
    const img = imgElRef.current;
    if (!img || natural.w === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = frame.outW;
    canvas.height = frame.outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const srcX = -offset.x / scale;
    const srcY = -offset.y / scale;
    const srcW = frame.w / scale;
    const srcH = frame.h / scale;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, frame.outW, frame.outH);
    canvas.toBlob((blob) => blob && onCropped(blob), "image/jpeg", 0.92);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold">Crop image</p>
          <button type="button" aria-label="Close" onClick={onCancel}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          Drag to reposition, use the slider to zoom.
        </p>
        <div
          className="mx-auto touch-none overflow-hidden rounded-xl bg-muted"
          style={{ width: frame.w, height: frame.h, cursor: "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {src && (
            <img
              ref={imgElRef}
              src={src}
              alt=""
              draggable={false}
              crossOrigin="anonymous"
              onLoad={(e) => {
                const el = e.currentTarget;
                setNatural({ w: el.naturalWidth, h: el.naturalHeight });
              }}
              style={{
                position: "relative",
                left: offset.x,
                top: offset.y,
                width: dispW || undefined,
                height: dispH || undefined,
                maxWidth: "none",
                userSelect: "none",
              }}
            />
          )}
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="mt-3 w-full"
          aria-label="Zoom"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-secondary py-2 text-sm font-semibold text-secondary-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground"
          >
            Use this crop
          </button>
        </div>
      </div>
    </div>
  );
}
