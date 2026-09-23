"use client";

import { useCallback, useMemo, useRef, useState } from "react";

const VIEWPORT = 240; // CSS px — the crop preview box
const OUTPUT = 512; // px — the exported square image

type Offset = { x: number; y: number };

function clampOffset(offset: Offset, dispW: number, dispH: number): Offset {
  const minX = VIEWPORT - dispW;
  const minY = VIEWPORT - dispH;
  return {
    x: Math.min(0, Math.max(minX, offset.x)),
    y: Math.min(0, Math.max(minY, offset.y)),
  };
}

/**
 * Modal: lets the person pan/zoom the image they just picked into a fixed
 * square crop before it's uploaded — "el área que quedará para la
 * visualización" is chosen here, not assumed via a blind center-crop.
 * Exports a fixed 512x512 webp Blob via an offscreen canvas.
 */
export function AvatarCropper({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const imgUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origin: Offset } | null>(null);

  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  const baseScale = naturalSize
    ? Math.max(VIEWPORT / naturalSize.w, VIEWPORT / naturalSize.h)
    : 0;
  const scale = baseScale * zoom;
  const dispW = naturalSize ? naturalSize.w * scale : 0;
  const dispH = naturalSize ? naturalSize.h * scale : 0;

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const base = Math.max(VIEWPORT / w, VIEWPORT / h);
    // Center the image in the viewport at zoom=1.
    setNaturalSize({ w, h });
    setOffset({ x: (VIEWPORT - w * base) / 2, y: (VIEWPORT - h * base) / 2 });
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: offset };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(
      clampOffset(
        { x: dragRef.current.origin.x + dx, y: dragRef.current.origin.y + dy },
        dispW,
        dispH,
      ),
    );
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleZoomChange = (value: number) => {
    if (!naturalSize) return;
    const newScale = baseScale * value;
    const newDispW = naturalSize.w * newScale;
    const newDispH = naturalSize.h * newScale;
    setZoom(value);
    setOffset((prev) => clampOffset(prev, newDispW, newDispH));
  };

  const handleConfirm = async () => {
    const img = imgRef.current;
    if (!img || !naturalSize) return;
    setSaving(true);

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setSaving(false);
      return;
    }

    const ratio = OUTPUT / VIEWPORT;
    ctx.drawImage(
      img,
      offset.x * ratio,
      offset.y * ratio,
      naturalSize.w * scale * ratio,
      naturalSize.h * scale * ratio,
    );

    canvas.toBlob(
      (blob) => {
        setSaving(false);
        if (blob) onConfirm(blob);
      },
      "image/webp",
      0.9,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
        <h2 className="text-base font-semibold text-card-foreground">Ajusta tu foto</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Arrastra para mover, usa el control para acercar o alejar.
        </p>

        <div
          className="relative mx-auto mt-4 touch-none overflow-hidden rounded-full border border-border bg-muted"
          style={{ width: VIEWPORT, height: VIEWPORT, cursor: "grab" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL, not an optimizable asset */}
          <img
            ref={imgRef}
            src={imgUrl}
            alt=""
            draggable={false}
            onLoad={handleImageLoad}
            className="absolute select-none"
            style={{
              left: offset.x,
              top: offset.y,
              width: dispW || undefined,
              height: dispH || undefined,
              maxWidth: "none",
            }}
          />
        </div>

        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => handleZoomChange(Number(e.target.value))}
          className="mt-4 w-full accent-primary"
          aria-label="Zoom"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-3 py-1.5 text-sm transition hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!naturalSize || saving}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Usar esta foto"}
          </button>
        </div>
      </div>
    </div>
  );
}
