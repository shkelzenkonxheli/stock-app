import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

function sanitizeFileSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function imageDirectory(productId: number) {
  return path.join(
    process.cwd(),
    "public",
    "uploads",
    "products",
    String(productId),
  );
}

function imagePublicPath(productId: number, fileName: string) {
  return `/uploads/products/${productId}/${fileName}`;
}

function extensionFromFile(file: File) {
  const fromName = path.extname(file.name).toLowerCase();

  if (fromName) {
    return fromName;
  }

  switch (file.type) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/avif":
      return ".avif";
    default:
      return ".jpg";
  }
}

export async function listProductImages(productId: number) {
  try {
    const entries = await readdir(imageDirectory(productId), {
      withFileTypes: true,
    });

    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => /\.(png|jpe?g|webp|avif)$/i.test(fileName))
      .sort((left, right) => left.localeCompare(right))
      .map((fileName) => ({
        label: fileName,
        value: imagePublicPath(productId, fileName),
      }));
  } catch {
    return [];
  }
}

export async function saveProductImage(productId: number, file: File) {
  if (!file || file.size === 0) {
    return null;
  }

  if (!file.type.startsWith("image/")) {
    return null;
  }

  const directory = imageDirectory(productId);
  await mkdir(directory, { recursive: true });

  const originalBase = path.basename(file.name, path.extname(file.name));
  const safeBase = sanitizeFileSegment(originalBase) || "image";
  const extension = extensionFromFile(file);
  const fileName = `${Date.now()}-${safeBase}${extension}`;
  const filePath = path.join(directory, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, buffer);

  return imagePublicPath(productId, fileName);
}
