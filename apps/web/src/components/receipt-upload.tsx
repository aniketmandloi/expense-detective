"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, FileImage, Loader2 } from "lucide-react";
import Image from "next/image";

interface ReceiptFile {
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

interface ReceiptUploadProps {
  onFileUploaded?: (file: ReceiptFile) => void;
  maxSize?: number; // in bytes
  accept?: string;
}

export default function ReceiptUpload({
  onFileUploaded,
  maxSize = 10 * 1024 * 1024, // 10MB default
  accept = "image/jpeg,image/png,image/webp,application/pdf",
}: ReceiptUploadProps) {
  const [file, setFile] = useState<ReceiptFile | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(
    async (selectedFile: File) => {
      // Validate file size
      if (selectedFile.size > maxSize) {
        alert(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
        return;
      }

      // Create preview
      const preview = selectedFile.type.startsWith("image/")
        ? URL.createObjectURL(selectedFile)
        : "";

      const fileData: ReceiptFile = {
        file: selectedFile,
        preview,
        uploading: true,
        uploaded: false,
      };

      setFile(fileData);

      // Upload file
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const data = await response.json();
        const uploadedFile: ReceiptFile = {
          ...fileData,
          uploading: false,
          uploaded: true,
          fileUrl: data.file.url,
          fileName: data.file.fileName,
          fileSize: data.file.fileSize,
          mimeType: data.file.mimeType,
        };

        setFile(uploadedFile);
        onFileUploaded?.(uploadedFile);
      } catch (error) {
        console.error("Upload error:", error);
        alert(
          `Failed to upload file: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setFile(null);
      }
    },
    [maxSize, onFileUploaded]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
    setFile(null);
  }, [file]);

  return (
    <div className="w-full">
      {!file ? (
        <Card
          className={`border-2 border-dashed p-12 transition-all ${
            dragActive
              ? "border-primary bg-primary/5 dark:bg-primary/10"
              : "border-gray-300 dark:border-gray-700"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center gap-6">
            <div
              className={`h-16 w-16 rounded-full flex items-center justify-center transition-colors ${
                dragActive ? "bg-primary/10" : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <Upload
                className={`h-8 w-8 ${
                  dragActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">
                Drag and drop your receipt here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground pt-2">
                Supports JPEG, PNG, WebP, PDF (max {maxSize / 1024 / 1024}MB)
              </p>
            </div>
            <Button type="button" variant="outline" asChild>
              <label className="cursor-pointer">
                Select File
                <input
                  type="file"
                  className="hidden"
                  accept={accept}
                  onChange={handleChange}
                />
              </label>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-4">
            {file.preview ? (
              <div className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
                <Image
                  src={file.preview}
                  alt="Receipt preview"
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="h-20 w-20 shrink-0 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <FileImage className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base truncate mb-1">
                {file.file.name}
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                {(file.file.size / 1024).toFixed(2)} KB
              </p>
              {file.uploading && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Uploading...
                  </span>
                </div>
              )}
              {file.uploaded && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <p className="text-sm text-primary font-medium">
                    Uploaded successfully
                  </p>
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              disabled={file.uploading}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
