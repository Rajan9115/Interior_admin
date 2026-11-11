"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { slugify, ProjectInput, validateForPublishing } from "@/lib/validation/project";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MediaPickerModal } from "@/components/media/MediaPickerModal";
import { ProjectPreviewModal } from "@/components/projects/ProjectPreviewModal";
import { MediaAssetItem } from "@/components/media/MediaDetailsModal";
import {
  Save,
  Send,
  Archive,
  Plus,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Star,
  ArrowUp,
  ArrowDown,
  Eye,
  RotateCcw,
  Video,
} from "lucide-react";
import { ProjectMediaRole } from "@prisma/client";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

export interface AttachedMediaItem {
  mediaAssetId: string;
  role: ProjectMediaRole;
  sortOrder: number;
  asset: {
    id: string;
    publicId: string;
    secureUrl: string;
    mediaType: "IMAGE" | "VIDEO" | string;
    altText?: string | null;
    caption?: string | null;
    originalName?: string | null;
    durationSeconds?: number | null;
    format?: string | null;
    bytes?: bigint | number | string | null;
  };
}

interface ProjectFormProps {
  initialData?: Omit<Partial<ProjectInput>, "media"> & {
    id?: string;
    status?: string;
    media?: {
      role: ProjectMediaRole;
      sortOrder: number;
      mediaAsset: {
        id: string;
        publicId: string;
        secureUrl: string;
        mediaType: "IMAGE" | "VIDEO";
        altText?: string | null;
        caption?: string | null;
        originalName?: string | null;
        durationSeconds?: number | null;
        format?: string | null;
      };
    }[];
  };
  categories: CategoryOption[];
  isEditing?: boolean;
}

export function ProjectForm({
  initialData,
  categories,
  isEditing = false,
}: ProjectFormProps) {
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(Boolean(initialData?.slug));
  const [categoryId, setCategoryId] = useState(
    initialData?.categoryId || categories[0]?.id || ""
  );
  const [locationLabel, setLocationLabel] = useState(initialData?.locationLabel || "");
  const [shortDescription, setShortDescription] = useState(
    initialData?.shortDescription || ""
  );
  const [description, setDescription] = useState(initialData?.description || "");
  const [completionDate, setCompletionDate] = useState(
    initialData?.completionDate
      ? new Date(initialData.completionDate).toISOString().split("T")[0]
      : ""
  );
  const [isFeatured, setIsFeatured] = useState(Boolean(initialData?.isFeatured));
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription || "");
  const [highlights, setHighlights] = useState<string[]>(
    initialData?.highlights && initialData.highlights.length > 0
      ? initialData.highlights
      : [""]
  );

  // Attached media state
  const [attachedMedia, setAttachedMedia] = useState<AttachedMediaItem[]>(
    initialData?.media?.map((m) => ({
      mediaAssetId: m.mediaAsset.id,
      role: m.role,
      sortOrder: m.sortOrder,
      asset: m.mediaAsset,
    })) || []
  );

  // Modals & UI controls
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Status & feedback
  const [currentStatus, setCurrentStatus] = useState(initialData?.status || "DRAFT");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-slug generator
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!isSlugManuallyEdited) {
      setSlug(slugify(newTitle));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    setSlug(slugify(e.target.value));
  };

  // Highlights management
  const handleAddHighlight = () => {
    setHighlights([...highlights, ""]);
  };

  const handleHighlightChange = (index: number, value: string) => {
    const updated = [...highlights];
    updated[index] = value;
    setHighlights(updated);
  };

  const handleRemoveHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  // Media management
  const handleAddMediaFromPicker = (selectedAssets: MediaAssetItem[]) => {
    const newItems: AttachedMediaItem[] = selectedAssets.map((asset, idx) => ({
      mediaAssetId: asset.id,
      role: ProjectMediaRole.GALLERY,
      sortOrder: attachedMedia.length + idx,
      asset,
    }));

    setAttachedMedia((prev) => {
      const combined = [...prev, ...newItems];
      // If there is currently NO cover image, make the first image the COVER automatically
      const hasCover = combined.some((item) => item.role === ProjectMediaRole.COVER);
      if (!hasCover && combined.length > 0) {
        combined[0].role = ProjectMediaRole.COVER;
      }
      return combined;
    });
  };

  const handleRoleChange = (mediaAssetId: string, newRole: ProjectMediaRole) => {
    setAttachedMedia((prev) =>
      prev.map((item) => {
        if (item.mediaAssetId === mediaAssetId) {
          return { ...item, role: newRole };
        }
        // If changing to COVER, ensure no other item remains COVER (single-cover rule)
        if (newRole === ProjectMediaRole.COVER && item.role === ProjectMediaRole.COVER) {
          return { ...item, role: ProjectMediaRole.GALLERY };
        }
        return item;
      })
    );
  };

  const handleMoveMedia = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= attachedMedia.length) return;

    setAttachedMedia((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((item, idx) => ({ ...item, sortOrder: idx }));
    });
  };

  const handleRemoveMedia = (mediaAssetId: string) => {
    setAttachedMedia((prev) => {
      const filtered = prev.filter((item) => item.mediaAssetId !== mediaAssetId);
      // Re-assign sortOrder
      return filtered.map((item, idx) => ({ ...item, sortOrder: idx }));
    });
  };

  // Submit & Save Handler
  const handleSave = async (targetStatus: "DRAFT" | "PUBLISHED" = "DRAFT") => {
    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    // Validation before publish
    if (targetStatus === "PUBLISHED") {
      const preValidation = validateForPublishing({
        title,
        slug,
        categoryId,
        shortDescription,
        media: attachedMedia.map((m) => ({
          role: m.role,
          mediaAssetId: m.mediaAssetId,
        })),
      });

      if (!preValidation.isValid) {
        setError(preValidation.errors.join(" "));
        return;
      }
    }

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      categoryId,
      locationLabel: locationLabel.trim() || null,
      shortDescription: shortDescription.trim(),
      description: description.trim() || null,
      completionDate: completionDate ? new Date(completionDate).toISOString() : null,
      isFeatured,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
      highlights: highlights.map((h) => h.trim()).filter(Boolean),
      media: attachedMedia.map((m, idx) => ({
        mediaAssetId: m.mediaAssetId,
        role: m.role,
        sortOrder: idx,
      })),
      status: targetStatus,
    };

    try {
      setIsSaving(true);
      const url = isEditing
        ? `/api/v1/admin/projects/${initialData?.id}`
        : "/api/v1/admin/projects";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json?.error?.message || "Failed to save project.");
        if (json?.error?.fieldErrors) {
          setFieldErrors(json.error.fieldErrors);
        }
        return;
      }

      setCurrentStatus(targetStatus);
      setSuccessMessage(
        targetStatus === "PUBLISHED"
          ? "Project published successfully! It is now live on the public site."
          : isEditing
          ? "Draft project saved successfully."
          : "Draft project created successfully."
      );

      if (!isEditing && json.data?.id) {
        router.push(`/projects/${json.data.id}/edit`);
      } else {
        router.refresh();
      }
    } catch {
      setError("An unexpected network error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  // Unpublish handler
  const handleUnpublish = async () => {
    if (!initialData?.id) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch(`/api/v1/admin/projects/${initialData.id}/unpublish`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to unpublish project");
      }
      setCurrentStatus("DRAFT");
      setSuccessMessage("Project returned to Draft status.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unpublish failed");
    } finally {
      setIsSaving(false);
    }
  };

  // Archive handler
  const handleArchive = async () => {
    if (!initialData?.id) return;
    try {
      setIsArchiving(true);
      const res = await fetch(`/api/v1/admin/projects/${initialData.id}/archive`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to archive project.");
      }
      router.push("/projects");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Archive failed.");
    } finally {
      setIsArchiving(false);
      setIsArchiveModalOpen(false);
    }
  };

  const hasCover = attachedMedia.some((m) => m.role === ProjectMediaRole.COVER);
  const selectedCategoryName = categories.find((c) => c.id === categoryId)?.name;

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave(currentStatus === "PUBLISHED" ? "PUBLISHED" : "DRAFT");
        }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Left Column (2 Cols): Core Editorial Content & Media */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notifications */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="font-semibold">Unable to save project</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Card 1: Core Project Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h2 className="text-base font-semibold text-[#172B40] border-b border-slate-100 pb-3">
              Core Project Details
            </h2>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[#172B40] uppercase tracking-wider mb-1.5">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="e.g. 3BHK Modular Kitchen & False Ceiling"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
                required
              />
              {fieldErrors.title && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.title[0]}</p>
              )}
            </div>

            {/* Slug */}
            <div>
              <label className="block text-xs font-semibold text-[#172B40] uppercase tracking-wider mb-1.5">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-xs font-mono text-slate-500">
                  /projects/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={handleSlugChange}
                  placeholder="3bhk-modular-kitchen-false-ceiling"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-r-lg text-sm font-mono text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
                  required
                />
              </div>
              {fieldErrors.slug && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.slug[0]}</p>
              )}
            </div>

            {/* Category, Location & Completion Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#172B40] uppercase tracking-wider mb-1.5">
                  Service Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172B40] uppercase tracking-wider mb-1.5">
                  Location Label
                </label>
                <input
                  type="text"
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                  placeholder="e.g. Andheri West, Mumbai"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172B40] uppercase tracking-wider mb-1.5">
                  Completion Date
                </label>
                <input
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
                />
              </div>
            </div>

            {/* Short Summary */}
            <div>
              <label className="block text-xs font-semibold text-[#172B40] uppercase tracking-wider mb-1.5">
                Short Summary <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief 1-2 sentence overview shown in project cards and previews..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
                required
              />
              {fieldErrors.shortDescription && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.shortDescription[0]}</p>
              )}
            </div>

            {/* Full Description */}
            <div>
              <label className="block text-xs font-semibold text-[#172B40] uppercase tracking-wider mb-1.5">
                Detailed Scope of Work
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed notes on carpentry specifications, electrical wiring, paint coats, or false ceiling grid details..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
              />
            </div>
          </div>

          {/* Card 2: Highlights / Bullet Points */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-[#172B40]">Workmanship Highlights</h2>
                <p className="text-xs text-slate-500">Key bullet points (e.g. materials, hardware, standards)</p>
              </div>
              <button
                type="button"
                onClick={handleAddHighlight}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B58A58] hover:text-[#9E7444] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Bullet Point</span>
              </button>
            </div>

            <div className="space-y-3">
              {highlights.map((highlight, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400 w-5">{index + 1}.</span>
                  <input
                    type="text"
                    value={highlight}
                    onChange={(e) => handleHighlightChange(index, e.target.value)}
                    placeholder="e.g. BWR termite-resistant marine plywood core"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
                  />
                  {highlights.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveHighlight(index)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      title="Remove highlight"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Media & Photos (Phase 5 Full Integration) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div>
                <h2 className="text-base font-semibold text-[#172B40]">Project Media & Photos</h2>
                <p className="text-xs text-slate-500">
                  Select cover photo, execution photos, videos, and before/after pairs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaPickerOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#D9A84E] text-[#172B40] rounded-lg text-xs font-semibold hover:bg-[#e2b562] transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Add Media from Library
              </button>
            </div>

            {/* Cover missing alert */}
            {attachedMedia.length > 0 && !hasCover && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>No Cover Image Designated:</strong> Please assign one of the photos below as &quot;Cover Image&quot; before publishing.
                </span>
              </div>
            )}

            {attachedMedia.length === 0 ? (
              <div
                onClick={() => setIsMediaPickerOpen(true)}
                className="p-8 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No media attached to this project yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click here to attach photos and videos from your Cloudinary media library.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {attachedMedia.map((item, idx) => {
                  const isCover = item.role === ProjectMediaRole.COVER;
                  const isVideo = item.asset.mediaType === "VIDEO";

                  return (
                    <div
                      key={item.mediaAssetId}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-4 transition-all ${
                        isCover
                          ? "bg-amber-50/60 border-[#D9A84E] shadow-xs"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      {/* Thumbnail Preview */}
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-200">
                        {isVideo ? (
                          <div className="w-full h-full flex items-center justify-center text-purple-400 bg-slate-800">
                            <Video className="w-6 h-6" />
                          </div>
                        ) : (
                          <Image
                            src={item.asset.secureUrl}
                            alt={item.asset.altText || item.asset.originalName || "Asset"}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        )}
                        {isCover && (
                          <span
                            className="absolute top-1 left-1 bg-[#D9A84E] text-[#172B40] p-1 rounded shadow-xs"
                            title="Cover Image"
                          >
                            <Star className="w-3 h-3 fill-current" />
                          </span>
                        )}
                        {isVideo && (
                          <span className="absolute bottom-1 right-1 bg-purple-600 text-white text-[9px] px-1 py-0.5 rounded font-semibold">
                            Video
                          </span>
                        )}
                      </div>

                      {/* Info & Role Select */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800 truncate" title={item.asset.originalName || item.asset.publicId}>
                            {item.asset.originalName || item.asset.publicId}
                          </span>
                          {isCover && (
                            <span className="px-2 py-0.5 bg-[#D9A84E]/20 text-[#9E7444] rounded text-[10px] font-bold uppercase tracking-wider">
                              Cover
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono truncate">
                          {item.asset.publicId}
                        </p>

                        <div className="pt-1 flex items-center gap-2">
                          <label className="text-[11px] font-medium text-slate-600">Role:</label>
                          <select
                            value={item.role}
                            onChange={(e) =>
                              handleRoleChange(item.mediaAssetId, e.target.value as ProjectMediaRole)
                            }
                            className={`text-xs px-2.5 py-1 rounded-md border font-medium focus:outline-hidden ${
                              isCover
                                ? "bg-amber-100 border-[#D9A84E] text-[#9E7444]"
                                : "bg-white border-slate-300 text-slate-700"
                            }`}
                          >
                            <option value={ProjectMediaRole.COVER}>⭐ Cover Image (Main Display)</option>
                            <option value={ProjectMediaRole.GALLERY}>Gallery Photo / Video</option>
                            <option value={ProjectMediaRole.PROCESS}>Execution / Work in Progress</option>
                            <option value={ProjectMediaRole.BEFORE}>Before Renovation</option>
                            <option value={ProjectMediaRole.AFTER}>After Completion</option>
                          </select>
                        </div>
                      </div>

                      {/* Sorting & Removal Controls */}
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleMoveMedia(idx, "up")}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-30"
                          title="Move up in order"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveMedia(idx, "down")}
                          disabled={idx === attachedMedia.length - 1}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-30"
                          title="Move down in order"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(item.mediaAssetId)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 ml-1"
                          title="Unlink from project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Publishing Controls & SEO */}
        <div className="space-y-6">
          {/* Card: Publishing Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 sticky top-24">
            <h3 className="text-sm font-semibold text-[#172B40] uppercase tracking-wider font-mono border-b border-slate-100 pb-3">
              Lifecycle & Status
            </h3>

            {isEditing && (
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500">Current Status:</span>
                <span
                  className={`font-bold uppercase px-2 py-0.5 rounded text-[11px] ${
                    currentStatus === "PUBLISHED"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {currentStatus}
                </span>
              </div>
            )}

            {/* Featured toggle */}
            <div className="pt-2 pb-3 border-b border-slate-100">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded-md border-slate-300 text-[#B58A58] focus:ring-[#B58A58]"
                />
                <div>
                  <span className="text-xs font-semibold text-[#172B40] block">
                    Feature on Homepage
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight">
                    Showcase this project inside the curated portfolio grid on the home page.
                  </span>
                </div>
              </label>
            </div>

            {/* Preview Button */}
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="w-full py-2.5 px-4 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              Preview Client View
            </button>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {/* Save Draft */}
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave("DRAFT")}
                className="w-full py-2.5 px-4 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save as Draft"}
              </button>

              {/* Publish to Live Website */}
              <button
                type="button"
                disabled={isSaving || !hasCover}
                onClick={() => handleSave("PUBLISHED")}
                className="w-full py-2.5 px-4 bg-[#172B40] text-white text-xs font-semibold rounded-lg hover:bg-[#1f3752] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
                title={!hasCover ? "Please assign a cover image before publishing" : "Publish to live website"}
              >
                <Send className="w-4 h-4 text-[#D9A84E]" />
                {currentStatus === "PUBLISHED" ? "Update Live Project" : "Publish to Live Website"}
              </button>

              {/* Unpublish */}
              {isEditing && currentStatus === "PUBLISHED" && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleUnpublish}
                  className="w-full py-2 px-3 border border-amber-300 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Return to Draft
                </button>
              )}
            </div>

            {/* Archive */}
            {isEditing && (
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(true)}
                  className="w-full py-2 text-xs font-medium text-slate-400 hover:text-red-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Project</span>
                </button>
              </div>
            )}
          </div>

          {/* Card: SEO Metadata */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-[#172B40] uppercase tracking-wider font-mono border-b border-slate-100 pb-3">
              Search Engine Optimization
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Custom SEO Title
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Leave blank to use project title"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Meta Description
              </label>
              <textarea
                rows={3}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Leave blank to use short summary"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        projectId={initialData?.id}
        alreadySelectedIds={attachedMedia.map((m) => m.mediaAssetId)}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={handleAddMediaFromPicker}
      />

      {/* Live Client Preview Modal */}
      <ProjectPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={{
          title,
          categoryName: selectedCategoryName,
          locationLabel,
          shortDescription,
          description,
          completionDate,
          highlights: highlights.filter(Boolean),
          media: attachedMedia.map((m) => ({
            role: m.role,
            secureUrl: m.asset.secureUrl,
            mediaType: m.asset.mediaType,
            altText: m.asset.altText,
            caption: m.asset.caption,
          })),
        }}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isArchiveModalOpen}
        title="Archive Project"
        message={`Are you sure you want to archive "${title}"? It will be immediately removed from the public website, but its photos and documentation will be safely preserved in your CMS.`}
        confirmLabel={isArchiving ? "Archiving..." : "Archive Project"}
        isDestructive
        onConfirm={handleArchive}
        onCancel={() => setIsArchiveModalOpen(false)}
      />
    </>
  );
}
