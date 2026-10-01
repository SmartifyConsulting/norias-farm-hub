import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useSettings } from "@/lib/farm";

export function profileOf(user: User | null) {
  const m = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const full = (m.display_name || m.full_name || m.name || [m.first_name, m.last_name].filter(Boolean).join(" ") || "").trim();
  const first = (m.first_name || full.split(" ")[0] || "").trim();
  const initials = (full || user?.email || "?").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  return { full, first, initials, avatar: m.avatar_url || m.picture || "", email: user?.email ?? "" };
}

/** Account name → settings.owner when the device still has the default name. */
export function useProfileSync() {
  const { user } = useUser();
  const [s, update] = useSettings();
  useEffect(() => {
    const p = profileOf(user);
    if (user && p.full && (s.owner === "Farmer" || !s.owner)) update({ owner: p.full });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, s.owner]);
}

export async function saveAccountName(full: string) {
  const parts = full.trim().split(/\s+/);
  await supabase.auth.updateUser({ data: { display_name: full.trim(), first_name: parts[0] ?? "", last_name: parts.slice(1).join(" ") } });
}

export async function uploadAvatar(userId: string, file: File) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Please choose a JPG, PNG or WebP photo.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Photo must be 5 MB or smaller.");
  const path = `${userId}/avatar-${Date.now()}.${file.type.split("/")[1]}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const { error: e2 } = await supabase.auth.updateUser({ data: { avatar_url: url } });
  if (e2) throw e2;
  return url;
}

export async function removeAvatar() {
  await supabase.auth.updateUser({ data: { avatar_url: "" } });
}
