import { put } from "@vercel/blob";

function extensionFromType(type: string | null) {
  if (type?.includes("png")) return "png";
  if (type?.includes("webp")) return "webp";
  if (type?.includes("gif")) return "gif";
  if (type?.includes("avif")) return "avif";
  return "jpg";
}

export async function storePhotoFromUrl(url: string, key: string) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { Accept: "image/*" },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.startsWith("image/")) return null;
    const body = await response.arrayBuffer();
    if (body.byteLength < 32 || body.byteLength > 12_000_000) return null;
    const blob = await put(
      `people/${key}.${extensionFromType(contentType)}`,
      body,
      {
        access: "public",
        addRandomSuffix: true,
        contentType: contentType ?? "image/jpeg",
      },
    );
    return blob.url;
  } catch {
    return null;
  }
}

export async function storePhotoFromFile(file: File, key: string) {
  const blob = await put(`people/${key}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return blob.url;
}
