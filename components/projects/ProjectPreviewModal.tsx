"use client";

import React from "react";
import Image from "next/image";
import { X, MapPin, Calendar, CheckCircle2, Video } from "lucide-react";
import { ProjectMediaRole } from "@prisma/client";

interface ProjectPreviewData {
  title: string;
  categoryName?: string;
  locationLabel?: string | null;
  shortDescription: string;
  description?: string | null;
  completionDate?: string | null;
  highlights?: string[];
  media?: {
    role: ProjectMediaRole;
    secureUrl: string;
    mediaType?: string;
    altText?: string | null;
    caption?: string | null;
  }[];
}

interface ProjectPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ProjectPreviewData;
}

export function ProjectPreviewModal({
  isOpen,
  onClose,
  data,
}: ProjectPreviewModalProps) {
  if (!isOpen) return null;

  const coverItem = data.media?.find((m) => m.role === ProjectMediaRole.COVER);
  const galleryItems = data.media?.filter((m) => m.role !== ProjectMediaRole.COVER) || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9A84E]">
              Client Preview Mode
            </span>
            <h3 className="text-base font-semibold text-[#172B40]">
              {data.title || "Untitled Project"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Hero / Cover */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
            {coverItem ? (
              <Image
                src={coverItem.secureUrl}
                alt={coverItem.altText || data.title}
                fill
                priority
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <p className="text-sm">No cover image designated yet</p>
                <p className="text-xs text-slate-500 mt-1">Assign one photo as &quot;Cover&quot; to display here</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-6">
              {data.categoryName && (
                <span className="text-xs font-semibold uppercase tracking-wider text-[#D9A84E] mb-1">
                  {data.categoryName}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {data.title || "Project Title"}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-200">
                {data.locationLabel && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#D9A84E]" />
                    {data.locationLabel}
                  </span>
                )}
                {data.completionDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#D9A84E]" />
                    Completed: {new Date(data.completionDate).toLocaleDateString("en-IN", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Short Description */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Project Overview
            </h4>
            <p className="text-sm text-slate-800 leading-relaxed">
              {data.shortDescription || "No summary provided yet."}
            </p>
          </div>

          {/* Highlights */}
          {data.highlights && data.highlights.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Craftsmanship & Workmanship Highlights
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.highlights.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#D9A84E] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Description */}
          {data.description && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Detailed Scope of Work
              </h4>
              <div className="prose prose-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {data.description}
              </div>
            </div>
          )}

          {/* Media Gallery */}
          {galleryItems.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Project Gallery ({galleryItems.length} photos & videos)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {galleryItems.map((mediaItem, idx) => {
                  const isVideo = mediaItem.mediaType === "VIDEO";
                  return (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden bg-slate-900 border border-slate-200"
                    >
                      {isVideo ? (
                        <div className="w-full h-full flex items-center justify-center text-purple-400 bg-slate-800">
                          <Video className="w-8 h-8" />
                          <span className="absolute bottom-2 left-2 text-[10px] bg-purple-600 px-1.5 py-0.5 rounded text-white font-semibold">
                            Video
                          </span>
                        </div>
                      ) : (
                        <Image
                          src={mediaItem.secureUrl}
                          alt={mediaItem.altText || `Photo ${idx + 1}`}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover"
                        />
                      )}
                      <span className="absolute top-2 left-2 text-[9px] bg-slate-900/80 px-1.5 py-0.5 rounded text-white font-medium">
                        {mediaItem.role}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#172B40] text-white rounded-lg text-xs font-semibold hover:bg-[#1f3752]"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

