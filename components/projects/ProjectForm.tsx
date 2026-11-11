"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify, ProjectInput } from "@/lib/validation/project";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Save,
  Send,
  Archive,
  Plus,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface ProjectFormProps {
  initialData?: Partial<ProjectInput> & {
    id?: string;
    status?: string;
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

  // Status & feedback
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Archive modal
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

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

  // Submit Handler
  const handleSubmit = async (targetStatus: "DRAFT" | "PUBLISHED" = "DRAFT") => {
    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);

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

      setSuccessMessage(
        isEditing
          ? "Project updated successfully!"
          : "Project created successfully!"
      );

      if (!isEditing && json.data?.id) {
        router.push(`/projects/${json.data.id}/edit`);
      } else {
        router.refresh();
      }
    } catch {
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Archive Handler
  const handleArchive = async () => {
    if (!initialData?.id) return;
    try {
      setIsArchiving(true);
      const res = await fetch(`/api/v1/admin/projects/${initialData.id}/archive`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error?.message || "Failed to archive project.");
        setIsArchiveModalOpen(false);
        return;
      }
      setIsArchiveModalOpen(false);
      router.push("/projects");
      router.refresh();
    } catch {
      setError("Failed to archive project due to a network error.");
      setIsArchiveModalOpen(false);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{error}</p>
            {Object.keys(fieldErrors).length > 0 && (
              <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                {Object.entries(fieldErrors).map(([field, msgs]) => (
                  <li key={field}>
                    <span className="font-medium capitalize">{field}:</span> {msgs.join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Grid: Form Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Project Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Core Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h2 className="text-base font-semibold text-[#172B40] border-b border-slate-100 pb-3">
              General Project Information
            </h2>

            <div>
              <label htmlFor="title" className="block text-xs font-semibold uppercase text-slate-700 font-mono mb-1.5">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={handleTitleChange}
                placeholder="e.g. Modern Acrylic Modular Kitchen & Breakfast Counter"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58] focus:ring-1 focus:ring-[#B58A58]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="slug" className="block text-xs font-semibold uppercase text-slate-700 font-mono mb-1.5">
                  URL Slug <span className="text-red-500">*</span>
                </label>
                <div className="flex rounded-xl bg-slate-50 border border-slate-300 overflow-hidden focus-within:border-[#B58A58] focus-within:ring-1 focus-within:ring-[#B58A58]">
                  <span className="px-2.5 py-2.5 bg-slate-100 text-slate-400 text-xs font-mono select-none border-r border-slate-200">
                    /projects/
                  </span>
                  <input
                    id="slug"
                    type="text"
                    required
                    value={slug}
                    onChange={handleSlugChange}
                    className="w-full px-2.5 py-2 text-sm text-[#172B40] font-mono focus:outline-hidden bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="category" className="block text-xs font-semibold uppercase text-slate-700 font-mono mb-1.5">
                  Service Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="location" className="block text-xs font-semibold uppercase text-slate-700 font-mono mb-1.5">
                  Location Label (Optional)
                </label>
                <input
                  id="location"
                  type="text"
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                  placeholder="e.g. Residential Apartment, India"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
                />
              </div>

              <div>
                <label htmlFor="completionDate" className="block text-xs font-semibold uppercase text-slate-700 font-mono mb-1.5">
                  Handover / Completion Date
                </label>
                <input
                  id="completionDate"
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="shortDescription" className="block text-xs font-semibold uppercase text-slate-700 font-mono mb-1.5">
                Short Summary (Card Preview) <span className="text-red-500">*</span>
              </label>
              <textarea
                id="shortDescription"
                required
                rows={2}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="A concise 1-2 sentence overview shown in project cards and gallery previews..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-xs font-semibold uppercase text-slate-700 font-mono mb-1.5">
                Full Scope & Workmanship Description
              </label>
              <textarea
                id="description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive technical details on materials used, execution process, specifications, and craftsmanship nuances..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
              />
            </div>
          </div>

          {/* Card 2: Highlights / Bullet Points */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-[#172B40]">Project Highlights</h2>
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

          {/* Card 3: Media Upload Placeholder (Phase 4 Foundation) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-[#172B40]">Media & Photos</h2>
              <p className="text-xs text-slate-500">
                Cover photo and gallery documentation
              </p>
            </div>

            {/* Placeholder Indicator */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-dashed border-amber-300 text-amber-900 text-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Cloudinary Direct Signed Uploads (Scheduled for Phase 4)</span>
              </p>
              <p className="text-amber-700 leading-relaxed">
                Project draft creation and editing are active now. Direct browser-to-Cloudinary upload dropzones, file drag-and-drop reordering, and video streaming will activate in Phase 4.
              </p>
            </div>

            <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
              <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">Cover & Gallery Dropzone Placeholder</p>
              <p className="text-[11px] text-slate-400 mt-1">Accepts JPG, PNG, WebP up to 15MB, MP4 up to 100MB</p>
            </div>
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
                <span className="font-semibold uppercase text-slate-800">
                  {initialData?.status || "DRAFT"}
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

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleSubmit("DRAFT")}
                disabled={isSaving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#172B40] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save Draft"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit("PUBLISHED")}
                disabled={isSaving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#172B40] hover:bg-[#101E2E] rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-[#B58A58]" />
                <span>{isSaving ? "Processing..." : "Publish to Website"}</span>
              </button>

              {isEditing && initialData?.status !== "ARCHIVED" && (
                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(true)}
                  disabled={isSaving}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Project</span>
                </button>
              )}
            </div>
          </div>

          {/* Card: SEO Meta Overrides */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-[#172B40] uppercase tracking-wider font-mono border-b border-slate-100 pb-3">
              SEO & Social Metadata
            </h3>

            <div>
              <label htmlFor="seoTitle" className="block text-xs font-semibold text-slate-700 mb-1">
                Custom SEO Title (Optional)
              </label>
              <input
                id="seoTitle"
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Defaults to project title"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
              />
            </div>

            <div>
              <label htmlFor="seoDescription" className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Meta Description (Optional)
              </label>
              <textarea
                id="seoDescription"
                rows={3}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Defaults to short summary"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isArchiveModalOpen}
        title="Archive Project"
        message={`Are you sure you want to archive "${title}"? This will immediately remove it from the public website while safely preserving all project data and photos.`}
        confirmLabel="Archive"
        isDestructive
        isLoading={isArchiving}
        onConfirm={handleArchive}
        onCancel={() => setIsArchiveModalOpen(false)}
      />
    </div>
  );
}

