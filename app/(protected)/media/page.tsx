"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaUploader } from "@/components/media/MediaUploader";
import { MediaDetailsModal, MediaAssetItem } from "@/components/media/MediaDetailsModal";
import {
  Upload,
  Search,
  Image as ImageIcon,
  Video,
  Layers,
  Filter,
  RefreshCw,
} from "lucide-react";

export default function MediaLibraryPage() {
  const [mediaItems, setMediaItems] = useState<MediaAssetItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"ALL" | "IMAGE" | "VIDEO">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadIndex, setReloadIndex] = useState(0);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeAsset, setActiveAsset] = useState<MediaAssetItem | null>(null);

  const refreshList = useCallback(() => {
    setReloadIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        if (selectedType !== "ALL") params.set("type", selectedType);
        params.set("page", currentPage.toString());
        params.set("pageSize", "24");

        const res = await fetch(`/api/v1/admin/media?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load media assets");

        const json = await res.json();
        if (!ignore) {
          setMediaItems(json.data || []);
          setTotalCount(json.meta?.total || 0);
          setTotalPages(json.meta?.totalPages || 1);
        }
      } catch {
        if (!ignore) {
          setMediaItems([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [searchQuery, selectedType, currentPage, reloadIndex]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    refreshList();
  };

  const handleAssetUpdated = (updated: MediaAssetItem) => {
    setMediaItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    setActiveAsset(updated);
  };

  const handleAssetDeleted = (deletedId: string) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== deletedId));
    setTotalCount((prev) => Math.max(0, prev - 1));
  };

  const formatBytes = (bytes: string | number | bigint) => {
    const num = Number(bytes);
    if (!num) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return `${(num / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description="Organize, inspect, and upload authentic project photos and videos."
        actions={
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#D9A84E] text-[#172B40] rounded-lg text-sm font-semibold hover:bg-[#e2b562] transition-colors shadow-xs"
          >
            <Upload className="w-4 h-4" />
            Upload Media
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Type tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => {
              setSelectedType("ALL");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedType === "ALL"
                ? "bg-white text-[#172B40] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Media
          </button>
          <button
            onClick={() => {
              setSelectedType("IMAGE");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              selectedType === "IMAGE"
                ? "bg-white text-[#172B40] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Images
          </button>
          <button
            onClick={() => {
              setSelectedType("VIDEO");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              selectedType === "VIDEO"
                ? "bg-white text-[#172B40] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Videos
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename, alt text, or caption..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#172B40]"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
          >
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
          <button
            type="button"
            onClick={refreshList}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </form>
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-slate-200 animate-pulse rounded-xl border border-slate-200"
            />
          ))}
        </div>
      ) : mediaItems.length === 0 ? (
        <div className="flex flex-col items-center">
          <EmptyState
            title={searchQuery ? "No matching media found" : "No media assets uploaded yet"}
            description={
              searchQuery
                ? `No media items matching "${searchQuery}". Try a different keyword.`
                : "Upload authentic contractor project photos or videos to populate your library."
            }
            icon={<ImageIcon className="w-8 h-8 text-slate-400" />}
          />
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 px-4 py-2 bg-[#172B40] text-white text-xs font-semibold rounded-lg hover:bg-[#1f3752] transition-colors"
          >
            Upload First Media
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mediaItems.map((item) => {
              const isVideo = item.mediaType === "VIDEO" || item.resourceType === "VIDEO";
              const isLinked = (item._count?.projectLinks || 0) > 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveAsset(item)}
                  className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-[#D9A84E] transition-all cursor-pointer flex flex-col"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-slate-900 relative flex items-center justify-center overflow-hidden">
                    {isVideo ? (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-purple-400">
                        <Video className="w-8 h-8 group-hover:scale-110 transition-transform" />
                      </div>
                    ) : (
                      <Image
                        src={item.secureUrl}
                        alt={item.altText || item.originalName || "Asset"}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}

                    {/* Badge top-left */}
                    {isVideo && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-purple-600/90 text-white rounded text-[10px] font-semibold flex items-center gap-1 shadow-xs">
                        <Video className="w-3 h-3" />
                        {item.durationSeconds ? `${Math.round(item.durationSeconds)}s` : "Video"}
                      </span>
                    )}

                    {/* Linked project badge */}
                    {isLinked && (
                      <span
                        className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-[#172B40]/90 text-white rounded text-[10px] font-medium flex items-center gap-1 shadow-xs"
                        title={`Linked in ${item._count?.projectLinks} project(s)`}
                      >
                        <Layers className="w-3 h-3 text-[#D9A84E]" />
                        {item._count?.projectLinks}
                      </span>
                    )}
                  </div>

                  {/* Info Footer */}
                  <div className="p-2.5 bg-white border-t border-slate-100 flex-1 flex flex-col justify-between">
                    <p className="text-xs font-medium text-slate-800 truncate" title={item.originalName || item.publicId}>
                      {item.originalName || item.publicId}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>{formatBytes(item.bytes)}</span>
                      <span className="uppercase">{item.format || "media"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
              <span className="text-slate-500">
                Showing {mediaItems.length} of {totalCount} assets
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <MediaUploader
            onSuccess={() => {
              refreshList();
            }}
            onClose={() => {
              setShowUploadModal(false);
              refreshList();
            }}
          />
        </div>
      )}

      {/* Details / Inspection / Edit Modal */}
      {activeAsset && (
        <MediaDetailsModal
          asset={activeAsset}
          onClose={() => setActiveAsset(null)}
          onUpdate={handleAssetUpdated}
          onDelete={handleAssetDeleted}
        />
      )}
    </div>
  );
}
