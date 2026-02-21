import imageCompression from 'browser-image-compression';

export async function compressImageToBase64(file: File): Promise<string> {
    const options = {
        maxSizeMB: 0.5, // 500KB limit
        maxWidthOrHeight: 1200,
        useWebWorker: true,
    };

    try {
        const compressedFile = await imageCompression(file, options);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(compressedFile);
        });
    } catch (error) {
        console.error("Compression error:", error);
        throw error;
    }
}
