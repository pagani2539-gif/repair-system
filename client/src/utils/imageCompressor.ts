/**
 * Compresses an image file client-side using HTML5 Canvas.
 * @param file The original image file.
 * @param maxWidth The maximum width of the output image (default: 1200).
 * @param quality The compression quality from 0.0 to 1.0 (default: 0.7).
 */
export const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<File> => {
  return new Promise((resolve) => {
    // If not an image, return original file
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize logic
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            // Create a new File from the blob
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            // Only return compressed file if it is actually smaller
            resolve(compressedFile.size < file.size ? compressedFile : file);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};
