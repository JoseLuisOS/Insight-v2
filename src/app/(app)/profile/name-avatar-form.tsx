"use client";

import { useRef, useState } from "react";
import { AvatarCropper } from "@/components/avatar-cropper";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_BYTES = 2 * 1024 * 1024; // matches the bucket's fileSizeLimit
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function NameAvatarForm({
  userId,
  initialDisplayName,
  initialAvatarUrl,
}: {
  userId: string;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function saveName() {
    setSavingName(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("update_my_profile", {
      p_display_name: displayName.trim(),
      p_avatar_url: null,
    });
    setSavingName(false);
    setMessage(
      error
        ? { type: "error", text: error.message }
        : { type: "success", text: "Nombre actualizado." },
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setMessage({ type: "error", text: "Usa una imagen PNG, JPEG o WEBP." });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMessage({ type: "error", text: "La imagen debe pesar menos de 2 MB." });
      return;
    }
    setMessage(null);
    setPickedFile(file);
  }

  async function handleCropConfirm(blob: Blob) {
    setPickedFile(null);
    setUploadingAvatar(true);
    setMessage(null);

    const supabase = createClient();
    const path = `${userId}/avatar-${Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { contentType: "image/webp", upsert: true });

    if (uploadError) {
      setUploadingAvatar(false);
      setMessage({ type: "error", text: uploadError.message });
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    const { error: rpcError } = await supabase.rpc("update_my_profile", {
      p_display_name: displayName.trim(),
      p_avatar_url: publicUrl,
    });

    setUploadingAvatar(false);
    if (rpcError) {
      setMessage({ type: "error", text: rpcError.message });
      return;
    }
    setAvatarUrl(publicUrl);
    setMessage({ type: "success", text: "Foto actualizada." });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {avatarUrl ? (
            // Supabase Storage public URL — remote domain not worth
            // configuring next/image remotePatterns for a single avatar img.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">
              {initials(displayName || "?")}
            </span>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="rounded-md border border-border px-3 py-1.5 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadingAvatar ? "Subiendo..." : "Cambiar foto"}
          </button>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG o WEBP, máx. 2 MB.</p>
        </div>
      </div>

      <div>
        <label htmlFor="display_name" className="mb-1 block text-sm font-medium text-foreground">
          Nombre para mostrar
        </label>
        <div className="flex gap-2">
          <input
            id="display_name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tu nombre"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={saveName}
            disabled={savingName}
            className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {savingName ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {message && (
        <p
          className={`text-sm ${message.type === "success" ? "text-success" : "text-danger"}`}
        >
          {message.text}
        </p>
      )}

      {pickedFile && (
        <AvatarCropper
          file={pickedFile}
          onCancel={() => setPickedFile(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
