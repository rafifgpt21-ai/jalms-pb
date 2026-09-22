import { useState } from "react";
import { toast } from "sonner";

interface UseLocalUploadReturn {
    startUpload: (files: File[], folder?: string) => Promise<{ url: string; name: string }[] | undefined>;
    isUploading: boolean;
}

export function useLocalUpload(): UseLocalUploadReturn {
    const [isUploading, setIsUploading] = useState(false);

    const startUpload = async (files: File[], folder?: string) => {
        setIsUploading(true);
        const uploadedFiles: { url: string; name: string }[] = [];

        try {
            const form = new FormData();
            form.append("endpoint", "courseUpload");
            if (folder) form.append("folder", folder);
            files.forEach((file) => form.append("files", file, file.name));
            const response = await fetch("/api/pocketbase/upload", { method: "POST", body: form });
            const res = await response.json();
            if (!response.ok) throw new Error(res?.error || "Upload failed");
            res.forEach((file: { url: string; name: string }) => uploadedFiles.push({ url: file.url, name: file.name }));

            return uploadedFiles;
        } catch (error) {
            console.error("Upload error:", error);
            const msg = error instanceof Error ? error.message : "Upload failed";
            toast.error(`Upload failed: ${msg}`);
            return undefined;
        } finally {
            setIsUploading(false);
        }
    };

    return { startUpload, isUploading };
}
