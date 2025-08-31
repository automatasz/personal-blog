import { generateSvelteHelpers } from "@uploadthing/svelte";
export { UploadButton } from "@uploadthing/svelte";
import type { OurFileRouter } from "./storage";

export const { createUploader } = generateSvelteHelpers<OurFileRouter>();

export async function minifyImage(image: File, maxSize = 1024) {
  const bitmap = await createImageBitmap(image);

  const { width, height } = bitmap;
  const ratio = width > height ? maxSize / width : maxSize / height;

  const canvas = new OffscreenCanvas(width * ratio, height * ratio);
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await canvas.convertToBlob({ type: "image/webp",
    quality: 0.5 });
  const webpFile = new File([blob], image.name, {
    type: "image/webp",
    lastModified: Date.now(),
  });

  return webpFile;
}
