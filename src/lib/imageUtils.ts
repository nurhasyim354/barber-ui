const MAX_BYTES = 250 * 1024; // 250 KB
const MAX_DIMENSION = 1200;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.3;
const QUALITY_STEP = 0.1;

/**
 * Compress a File to a base64 JPEG string that is guaranteed to be < 250 KB.
 * - Resizes the longest side to at most MAX_DIMENSION px while preserving aspect ratio.
 * - Iteratively reduces JPEG quality until the output fits within MAX_BYTES.
 */
export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);

      let quality = INITIAL_QUALITY;
      let base64 = canvas.toDataURL('image/jpeg', quality);

      // base64 overhead: each char ≈ 0.75 bytes; header ~22 chars
      while (base64.length * 0.75 > MAX_BYTES && quality > MIN_QUALITY) {
        quality = Math.round((quality - QUALITY_STEP) * 10) / 10;
        base64 = canvas.toDataURL('image/jpeg', quality);
      }

      // If still too large after quality reduction, halve dimensions and retry once
      if (base64.length * 0.75 > MAX_BYTES) {
        canvas.width = Math.round(width / 2);
        canvas.height = Math.round(height / 2);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        base64 = canvas.toDataURL('image/jpeg', MIN_QUALITY);
      }

      resolve(base64);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal memuat gambar'));
    };

    img.src = objectUrl;
  });
}

/**
 * Compress multiple Files concurrently. All outputs are < 250 KB.
 */
export async function compressImages(files: File[]): Promise<string[]> {
  return Promise.all(files.map(compressImage));
}
