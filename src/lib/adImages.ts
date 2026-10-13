import { supabase } from "@/integrations/supabase/client";

export async function uploadAdImage(userId: string, file: File) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type))
    throw new Error("Please choose a JPG, PNG or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5 MB or smaller.");
  const path = `${userId}/ad-${Date.now()}.${file.type.split("/")[1]}`;
  const { error } = await supabase.storage
    .from("ad-images")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("ad-images").getPublicUrl(path).data.publicUrl;
}
