import { put } from "@vercel/blob";
import { publicHttpUrl } from "./urls";

const MAX_PHOTO_BYTES = 12_000_000;
const MIN_PHOTO_BYTES = 32;
const MAX_REDIRECTS = 3;

function extensionFromType(type: string | null) {
  if (type?.includes("png")) return "png";
  if (type?.includes("webp")) return "webp";
  if (type?.includes("gif")) return "gif";
  if (type?.includes("avif")) return "avif";
  return "jpg";
}

function isImageType(type: string | null) {
  return Boolean(type && type.startsWith("image/"));
}

async function fetchPublicImage(url: string) {
  let current = publicHttpUrl(url);
  if (!current) return null;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetch(current.toString(), {
      redirect: "manual",
      headers: { Accept: "image/*" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      current = publicHttpUrl(location, current.toString());
      if (!current) return null;
      continue;
    }
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type");
    if (contentType && !isImageType(contentType)) return null;
    return response;
  }
  return null;
}

export async function storePhotoFromUrl(url: string, key: string) {
  try {
    const response = await fetchPublicImage(url);
    if (!response) return null;
    const contentType = response.headers.get("content-type");
    const body = await response.arrayBuffer();
    if (body.byteLength < MIN_PHOTO_BYTES || body.byteLength > MAX_PHOTO_BYTES) {
      return null;
    }
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

export function isAllowedPhotoFile(file: File) {
  return (
    isImageType(file.type) &&
    file.size >= MIN_PHOTO_BYTES &&
    file.size <= MAX_PHOTO_BYTES
  );
}

export async function storePhotoFromFile(file: File, key: string) {
  if (!isAllowedPhotoFile(file)) {
    return null;
  }
  const blob = await put(`people/${key}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return blob.url;
}
