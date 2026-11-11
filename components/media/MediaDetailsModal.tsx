"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, Trash2, Check, AlertTriangle, ExternalLink, Video, ShieldAlert } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface MediaAssetItem {
  id: string;
  provider: string;
  publicId: string;
  assetId?: string | null;
  resourceType: "IMAGE" | "VIDEO";
  mediaType: "IMAGE" | "VIDEO";
  secureUrl: string;
  format?: string | null;
  mimeType?: string | null;
  bytes: string | number | bigint;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  originalName?: string | null;
  altText?: string | null;
  caption?: string | null;
  folder?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    projectLinks: number;
  };
}

interface MediaDetailsModalProps {
  asset: MediaAssetItem;
  onClose: () => void;
  onUpdate: (updatedAsset: MediaAssetItem) => void;
  onDelete: (id: string) => void;
}

export function MediaDetailsModal({
  asset,
  onClose,
  onUpdate,
  onDelete,
}: MediaDetailsModalProps) {
  const [altText, setAltText] = useState(asset.altText || "");
  const [caption, setCaption] = useState(asset.caption || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isVideo = asset.mediaType === "VIDEO" || asset.resourceType === "VIDEO";
  const linkedCount = asset._count?.projectLinks || 0;
  const isLinked = linkedCount > 0;

  const formatBytes = (bytes: string | number | bigint) => {
    const num = Number(bytes);
    if (!num) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return `${(num / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setErrorMessage(null);

      const res = await fetch(`/api/v1/admin/media/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          altText: altText.trim() || null,
          caption: caption.trim() || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to update media details");
      }

      const { data } = await res.json();
      onUpdate({ ...asset, ...data });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setErrorMessage(null);

      const res = await fetch(`/api/v1/admin/media/${asset.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to delete media asset");
      }

      onDelete(asset.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Deletion failed");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="min-w-0 pr-4">
              <h3 className="text-base font-semibold text-[#172B40] truncate">
                {asset.originalName || asset.publicId}
              </h3>
              <p className="text-xs text-slate-500 font-mono truncate">{asset.publicId}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Preview */}
            <div className="space-y-4">
              <div className="relative rounded-xl border border-slate-200 bg-slate-900 overflow-hidden aspect-video flex items-center justify-center">
                {isVideo ? (
                  <video
                    src={asset.secureUrl}
                    controls
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Image
                    src={asset.secureUrl}
                    alt={asset.altText || asset.originalName || "Media Preview"}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain"
                    priority
                  />
                )}
                {isVideo && (
                  <div className="absolute top-3 left-3 px-2 py-1 bg-purple-600/90 text-white rounded text-xs font-medium flex items-center gap-1 shadow">
                    <Video className="w-3.5 h-3.5" /> Video
                  </div>
                )}
              </div>

              {/* Technical Specifications */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Dimensions</span>
                  <span className="font-medium text-slate-800">
                    {asset.width && asset.height ? `${asset.width} × ${asset.height} px` : "Unknown"}
                  </span>
                </div>
                {isVideo && asset.durationSeconds && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Duration</span>
                    <span className="font-medium text-slate-800">{asset.durationSeconds.toFixed(1)}s</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">File Size</span>
                  <span className="font-medium text-slate-800">{formatBytes(asset.bytes)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Format</span>
                  <span className="font-medium text-slate-800 uppercase">{asset.format || "N/A"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Folder</span>
                  <span className="font-medium text-slate-800">{asset.folder || "root"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Uploaded</span>
                  <span className="font-medium text-slate-800">
                    {new Date(asset.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <a
                href={asset.secureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#D9A84E] hover:text-[#b88c38] font-medium"
              >
                Open original in Cloudinary CDN <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Right Controls */}
            <div className="space-y-6 flex flex-col justify-between">
              <form onSubmit={handleSaveMetadata} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Linked Projects Status */}
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    isLinked
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  {isLinked ? (
                    <>
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Linked to <strong>{linkedCount}</strong> project(s). Deletion is safely locked.
                      </span>
                    </>
                  ) : (
                    <span>Not currently linked to any projects. Safe to delete.</span>
                  )}
                </div>

                {/* Alt Text */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Alt Text (Accessibility & SEO)
                  </label>
                  <input
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="e.g. Modern modular kitchen woodwork with acrylic finish in Mumbai"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#172B40]"
                    maxLength={255}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Accurate description of the contractor work shown in this media.
                  </p>
                </div>

                {/* Caption */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Caption (Public display)
                  </label>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="e.g. Completed false ceiling layout with cove lighting"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#172B40]"
                    maxLength={500}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 px-4 bg-[#172B40] text-white text-sm font-medium rounded-lg hover:bg-[#1f3752] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? "Saving..." : saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" /> Saved Successfully
                    </>
                  ) : (
                    "Save Metadata"
                  )}
                </button>
              </form>

              {/* Deletion Section */}
              <div className="pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLinked || isDeleting}
                  className="w-full py-2 px-3 border border-red-200 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  title={isLinked ? "Unlink this asset from all projects before deleting" : "Delete asset"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isLinked ? "Cannot Delete While Linked to Projects" : "Delete Media Asset"}
                </button>
                {isLinked && (
                  <p className="text-[11px] text-slate-400 text-center mt-1">
                    Protected by integrity rules: cannot delete media in use by live or draft projects.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Media Asset"
        message={`Are you sure you want to permanently delete "${asset.originalName || asset.publicId}"? This will delete both the database record and the Cloudinary CDN asset.`}
        confirmLabel={isDeleting ? "Deleting..." : "Permanently Delete"}
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

