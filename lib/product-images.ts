import { deleteFromStorageBucket, storagePathFromPublicUrl as storagePathInBucket } from "@/lib/storage-cleanup";

export const PRODUCT_IMAGE_BUCKET = "product-images";

/** @deprecated use storagePathInBucket(PRODUCT_IMAGE_BUCKET, url) via lib/storage-cleanup directly for new code */
export function storagePathFromPublicUrl(url: string): string | null {
  return storagePathInBucket(PRODUCT_IMAGE_BUCKET, url);
}

/**
 * Batch-deletes product images from storage given their public URLs.
 * Shared by the product delete/edit routes and the admin hard-delete flow
 * (deleting a vendor deletes every one of their products' images too).
 */
export async function deleteProductImagesFromStorage(urls: string[]): Promise<void> {
  await deleteFromStorageBucket(PRODUCT_IMAGE_BUCKET, urls);
}
