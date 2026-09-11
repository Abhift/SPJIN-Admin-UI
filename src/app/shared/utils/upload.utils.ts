/**
 * Central upload limits — edit here to change limits across the entire admin UI.
 */
export const UPLOAD_LIMITS = {
  /** Maximum image size in MB (after compression) */
  IMAGE_MAX_MB: 20,
  /** Maximum PDF / non-image file size in MB */
  PDF_MAX_MB: 50,
} as const;

const MB = 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

/**
 * Compress an image file to WebP at 85% quality.
 * Returns the original file if it is not an image or compression makes it larger.
 */
export function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const name = file.name.replace(/\.[^.]+$/, '.webp');
            resolve(new File([blob], name, { type: 'image/webp' }));
          } else {
            resolve(file);
          }
        },
        'image/webp',
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

/**
 * Validate an image file after compression.
 * Returns an error string, or null if valid.
 */
export function validateImageSize(file: File): string | null {
  if (file.size > UPLOAD_LIMITS.IMAGE_MAX_MB * MB) {
    return `Image exceeds ${UPLOAD_LIMITS.IMAGE_MAX_MB} MB even after compression (${formatFileSize(file.size)})`;
  }
  return null;
}

/**
 * Validate a non-image (PDF / doc) file.
 * Returns an error string, or null if valid.
 */
export function validateFileSize(file: File): string | null {
  if (file.size > UPLOAD_LIMITS.PDF_MAX_MB * MB) {
    return `File exceeds ${UPLOAD_LIMITS.PDF_MAX_MB} MB (${formatFileSize(file.size)}). Please reduce the file size.`;
  }
  return null;
}
