"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, CheckCircle, AlertCircle, RefreshCw, FileText, Image as ImageIcon, Video } from "lucide-react";

interface UploadFileState {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "queued" | "uploading" | "verifying" | "success" | "error";
  errorMessage?: string;
  resultAsset?: unknown;
}

interface MediaUploaderProps {
  onSuccess?: () => void;
  onClose?: () => void;
  projectId?: string;
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_CONCURRENT = 3;

export function MediaUploader({ onSuccess, onClose, projectId }: MediaUploaderProps) {
  const [files, setFiles] = useState<UploadFileState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const activeUploadsCountRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processQueueRef = useRef<() => void>(() => {});

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      return { valid: false, error: "Only image (JPG, PNG, WebP) and video (MP4, MOV) files are supported." };
    }

    if (isImage && file.size > MAX_IMAGE_BYTES) {
      return { valid: false, error: `Image exceeds 15 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).` };
    }

    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      return { valid: false, error: `Video exceeds 100 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).` };
    }

    return { valid: true };
  };

  const uploadSingleFile = useCallback(async (fileState: UploadFileState) => {
    const updateState = (updates: Partial<UploadFileState>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileState.id ? { ...f, ...updates } : f))
      );
    };

    try {
      updateState({ status: "uploading", progress: 5, errorMessage: undefined });

      const isVideo = fileState.file.type.startsWith("video/");
      const resourceType = isVideo ? "video" : "image";

      // 1. Request signed parameters from server
      const sigRes = await fetch("/api/v1/admin/media/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType,
          projectId,
          folderSuffix: projectId ? `projects/${projectId}` : "library",
        }),
      });

      if (!sigRes.ok) {
        const errorData = await sigRes.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to authorize upload");
      }

      const { data: sigData } = await sigRes.json();

      // 2. Direct browser-to-Cloudinary upload via XMLHttpRequest for granular progress
      const formData = new FormData();
      formData.append("file", fileState.file);
      formData.append("api_key", sigData.apiKey);
      formData.append("timestamp", sigData.timestamp.toString());
      formData.append("signature", sigData.signature);
      formData.append("folder", sigData.folder);

      const cloudUploadResult = await new Promise<{ public_id: string; secure_url: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", sigData.uploadUrl);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.min(Math.round((e.loaded / e.total) * 90), 90);
            updateState({ progress: percent });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              resolve(res);
            } catch {
              reject(new Error("Invalid response from storage provider"));
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error?.message || "Storage upload failed"));
            } catch {
              reject(new Error(`Storage error (${xhr.status})`));
            }
          }
        };

        xhr.onerror = () => reject(new Error("Network connection error during upload"));
        xhr.send(formData);
      });

      // 3. Confirm with backend to verify metadata directly with Cloudinary
      updateState({ status: "verifying", progress: 95 });

      const confirmRes = await fetch("/api/v1/admin/media/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: cloudUploadResult.public_id,
          resourceType,
          originalName: fileState.name,
        }),
      });

      if (!confirmRes.ok) {
        const confirmErr = await confirmRes.json().catch(() => ({}));
        throw new Error(confirmErr.error?.message || "Server verification failed");
      }

      const confirmedData = await confirmRes.json();
      updateState({ status: "success", progress: 100, resultAsset: confirmedData.data });
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      updateState({ status: "error", progress: 0, errorMessage: msg });
    } finally {
      activeUploadsCountRef.current -= 1;
      processQueueRef.current();
    }
  }, [projectId, onSuccess]);

  const processQueue = useCallback(() => {
    setFiles((currentFiles) => {
      const runningCount = activeUploadsCountRef.current;
      const availableSlots = MAX_CONCURRENT - runningCount;

      if (availableSlots <= 0) return currentFiles;

      const queuedFiles = currentFiles.filter((f) => f.status === "queued");
      const filesToStart = queuedFiles.slice(0, availableSlots);

      filesToStart.forEach((fileState) => {
        activeUploadsCountRef.current += 1;
        uploadSingleFile(fileState);
      });

      return currentFiles;
    });
  }, [uploadSingleFile]);

  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  const addFiles = (selectedFiles: FileList | File[]) => {
    const newItems: UploadFileState[] = [];

    Array.from(selectedFiles).forEach((file) => {
      const validation = validateFile(file);
      const fileId = `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      newItems.push({
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: validation.valid ? "queued" : "error",
        errorMessage: validation.error,
      });
    });

    setFiles((prev) => [...prev, ...newItems]);
    setTimeout(processQueue, 50);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const retryUpload = (id: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status: "queued", progress: 0, errorMessage: undefined } : f
      )
    );
    setTimeout(processQueue, 50);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const hasActiveUploads = files.some(
    (f) => f.status === "uploading" || f.status === "verifying" || f.status === "queued"
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-semibold text-[#172B40]">Upload Media</h3>
          <p className="text-xs text-slate-500">
            Direct browser-to-cloud upload. Authentic contractor photos and work videos only.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            disabled={hasActiveUploads}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-[#D9A84E] bg-[#D9A84E]/5"
            : "border-slate-300 hover:border-[#172B40] hover:bg-slate-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
          }}
        />
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-3">
          <Upload className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-800">
          Click to choose files or drag and drop
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Images up to 15 MB (JPG, PNG, WebP) &bull; Videos up to 100 MB (MP4, MOV) &bull; Max 3 concurrent
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {files.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                {item.type.startsWith("video/") ? (
                  <Video className="w-4 h-4 text-purple-600" />
                ) : item.type.startsWith("image/") ? (
                  <ImageIcon className="w-4 h-4 text-[#D9A84E]" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 truncate" title={item.name}>
                    {item.name}
                  </span>
                  <span className="text-slate-500 ml-2 shrink-0">{formatBytes(item.size)}</span>
                </div>

                {/* Progress bar */}
                {(item.status === "uploading" || item.status === "verifying") && (
                  <div className="mt-2">
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#D9A84E] h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {item.status === "uploading"
                        ? `Uploading direct to Cloudinary... ${item.progress}%`
                        : "Authoritatively verifying with server..."}
                    </span>
                  </div>
                )}

                {item.status === "queued" && (
                  <span className="text-[10px] text-slate-500 mt-1 block">Queued (waiting for slot)</span>
                )}

                {item.status === "success" && (
                  <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                    <CheckCircle className="w-3 h-3" /> Upload verified and stored
                  </span>
                )}

                {item.status === "error" && (
                  <span className="text-[10px] text-red-600 flex items-center gap-1 mt-1 font-medium">
                    <AlertCircle className="w-3 h-3" /> {item.errorMessage || "Upload failed"}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="shrink-0 flex items-center gap-1">
                {item.status === "error" && (
                  <button
                    onClick={() => retryUpload(item.id)}
                    className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    title="Retry upload"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                {item.status !== "uploading" && item.status !== "verifying" && (
                  <button
                    onClick={() => removeFile(item.id)}
                    className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <span className="text-xs text-slate-500">
          {files.filter((f) => f.status === "success").length} of {files.length} uploaded
        </span>
        <button
          onClick={onClose}
          disabled={hasActiveUploads}
          className="px-4 py-2 bg-[#172B40] text-white rounded-lg text-sm font-medium hover:bg-[#1f3752] transition-colors disabled:opacity-50"
        >
          {hasActiveUploads ? "Uploading..." : "Done"}
        </button>
      </div>
    </div>
  );
}
