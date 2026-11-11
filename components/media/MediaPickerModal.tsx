"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, Search, Image as ImageIcon, Video, Check, Upload } from "lucide-react";
import { MediaAssetItem } from "./MediaDetailsModal";
import { MediaUploader } from "./MediaUploader";

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (assets: MediaAssetItem[]) => void;
  alreadySelectedIds?: string[];
  projectId?: string;
}

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  alreadySelectedIds = [],
  projectId,
}: MediaPickerModalProps) {
  const [items, setItems] = useState<MediaAssetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"ALL" | "IMAGE" | "VIDEO">("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUploadingTab, setIsUploadingTab] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;
    async function loadAssets() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        if (selectedType !== "ALL") params.set("type", selectedType);
        params.set("pageSize", "40");

        const res = await fetch(`/api/v1/admin/media?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load");

        const json = await res.json();
        if (!ignore) {
          setItems(json.data || []);
        }
      } catch {
        if (!ignore) {
          setItems([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadAssets();

    return () => {
      ignore = true;
    };
  }, [isOpen, searchQuery, selectedType]);

  const reloadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (selectedType !== "ALL") params.set("type", selectedType);
      params.set("pageSize", "40");

      const res = await fetch(`/api/v1/admin/media?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setItems(json.data || []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedType]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setIsUploadingTab(false);
    onClose();
  };

  const handleConfirmSelection = () => {
    const selectedAssets = items.filter((item) => selectedIds.has(item.id));
    setSelectedIds(new Set());
    setIsUploadingTab(false);
    onSelect(selectedAssets);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-base font-semibold text-[#172B40]">Select Media from Library</h3>
            <p className="text-xs text-slate-500">
              Choose authentic photographs and videos to attach to this project.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher / Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setIsUploadingTab(false);
                  setSelectedType("ALL");
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  !isUploadingTab && selectedType === "ALL"
                    ? "bg-white text-[#172B40] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsUploadingTab(false);
                  setSelectedType("IMAGE");
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                  !isUploadingTab && selectedType === "IMAGE"
                    ? "bg-white text-[#172B40] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Images
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsUploadingTab(false);
                  setSelectedType("VIDEO");
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                  !isUploadingTab && selectedType === "VIDEO"
                    ? "bg-white text-[#172B40] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Video className="w-3.5 h-3.5" /> Videos
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsUploadingTab((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
                isUploadingTab
                  ? "bg-[#D9A84E] text-[#172B40] border-[#D9A84E]"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              {isUploadingTab ? "Back to Library" : "Upload New Files"}
            </button>
          </div>

          {!isUploadingTab && (
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#172B40]"
              />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {isUploadingTab ? (
            <div className="flex justify-center">
              <MediaUploader
                projectId={projectId}
                onSuccess={() => {
                  reloadAssets();
                  setIsUploadingTab(false);
                }}
                onClose={() => setIsUploadingTab(false)}
              />
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-slate-100 animate-pulse rounded-lg border border-slate-200"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium">No media assets found</p>
              <p className="text-xs text-slate-400 mt-1">Upload new photos or videos to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {items.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isAlreadyAttached = alreadySelectedIds.includes(item.id);
                const isVideo = item.mediaType === "VIDEO" || item.resourceType === "VIDEO";

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!isAlreadyAttached) toggleSelect(item.id);
                    }}
                    className={`relative aspect-square rounded-lg border overflow-hidden transition-all ${
                      isAlreadyAttached
                        ? "opacity-40 cursor-not-allowed border-slate-200"
                        : isSelected
                        ? "ring-2 ring-[#D9A84E] border-[#D9A84E] cursor-pointer"
                        : "border-slate-200 hover:border-slate-400 cursor-pointer"
                    }`}
                  >
                    {isVideo ? (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-purple-400">
                        <Video className="w-6 h-6" />
                      </div>
                    ) : (
                      <Image
                        src={item.secureUrl}
                        alt={item.altText || item.originalName || "Asset"}
                        fill
                        sizes="120px"
                        className="object-cover"
                      />
                    )}

                    {/* Selected Checkmark Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#D9A84E] text-[#172B40] flex items-center justify-center shadow-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}

                    {/* Already attached indicator */}
                    {isAlreadyAttached && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-[10px] font-medium p-1 text-center">
                        Already attached
                      </div>
                    )}

                    {/* Video badge */}
                    {isVideo && (
                      <span className="absolute bottom-1.5 left-1.5 px-1 py-0.5 bg-purple-600/90 text-white rounded text-[9px] font-semibold">
                        Video
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {selectedIds.size} media item(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={handleConfirmSelection}
              className="px-4 py-2 bg-[#172B40] text-white rounded-lg text-xs font-semibold hover:bg-[#1f3752] transition-colors disabled:opacity-40"
            >
              Add Selected ({selectedIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
