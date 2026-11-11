"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Sparkles,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Layers,
  MapPin,
} from "lucide-react";

interface MediaAsset {
  id: string;
  secureUrl: string;
  mediaType: string;
}

interface ProjectMediaItem {
  role: string;
  mediaAsset: MediaAsset;
}

interface CuratedProject {
  id: string;
  title: string;
  slug: string;
  locationLabel?: string | null;
  shortDescription: string;
  status: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  media: ProjectMediaItem[];
}

export default function HomepageManagerPage() {
  const [curatedList, setCuratedList] = useState<CuratedProject[]>([]);
  const [eligibleList, setEligibleList] = useState<CuratedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add Project Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Preview Modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const reloadHomepageData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/homepage");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load homepage data");
      }

      setCuratedList(json.data.curated || []);
      setEligibleList(json.data.eligible || []);
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load homepage data");
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const res = await fetch("/api/v1/admin/homepage");
        const json = await res.json();
        if (active) {
          if (res.ok && json.success) {
            setCuratedList(json.data.curated || []);
            setEligibleList(json.data.eligible || []);
            setHasUnsavedChanges(false);
          } else {
            setError(json.error?.message || "Failed to load homepage data");
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load homepage data");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= curatedList.length) return;

    const updated = [...curatedList];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setCuratedList(updated);
    setHasUnsavedChanges(true);
  };

  const handleRemove = (projectId: string) => {
    const project = curatedList.find((p) => p.id === projectId);
    if (!project) return;

    setCuratedList((prev) => prev.filter((p) => p.id !== projectId));
    setEligibleList((prev) => (prev.some((p) => p.id === projectId) ? prev : [...prev, project]));
    setHasUnsavedChanges(true);
  };

  const handleAddProject = (project: CuratedProject) => {
    setCuratedList((prev) => [...prev, project]);
    setHasUnsavedChanges(true);
    setIsAddModalOpen(false);
  };

  const handleSaveCuratedSequence = async () => {
    try {
      setSaving(true);
      setError(null);

      const projectIds = curatedList.map((p) => p.id);
      const res = await fetch("/api/v1/admin/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save homepage sequence");
      }

      setHasUnsavedChanges(false);
      showToast(`Homepage featured order successfully saved (${projectIds.length} projects).`);
      await reloadHomepageData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save sequence");
    } finally {
      setSaving(false);
    }
  };

  // Get project cover URL
  const getCoverUrl = (project: CuratedProject) => {
    const coverMedia = project.media?.find((m) => m.role === "COVER") || project.media?.[0];
    return coverMedia?.mediaAsset?.secureUrl || "/images/projects/project-1.png";
  };

  const curatedIds = new Set(curatedList.map((p) => p.id));
  const availableToAdd = eligibleList.filter((p) => !curatedIds.has(p.id));

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Homepage Featured Projects"
        description="Curate and order projects showcased on the public website home page portfolio grid."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPreviewModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Preview Homepage Grid</span>
            </button>
            <button
              onClick={handleSaveCuratedSequence}
              disabled={saving || !hasUnsavedChanges}
              className="px-4 py-1.5 text-xs font-semibold bg-[#172B40] text-white rounded-lg hover:bg-[#1e3854] disabled:opacity-40 flex items-center gap-1.5 shadow-2xs"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{hasUnsavedChanges ? "Save Changes" : "Sequence Saved"}</span>
            </button>
          </div>
        }
      />

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Info Notice */}
      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-amber-950">Architectural Home Showcase Policy</p>
          <p className="text-amber-800">
            Only <strong>PUBLISHED</strong> projects with verified high-resolution cover photos can appear here.
            Use the up and down arrows to set the exact visual narrative that prospective homeowners see first.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-[#B58A58] mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading homepage portfolio configuration...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#B58A58]" />
              <span className="text-xs font-semibold text-[#172B40] uppercase tracking-wider font-mono">
                Curated Sequence ({curatedList.length} Active)
              </span>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={availableToAdd.length === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#172B40] text-white rounded-lg hover:bg-[#1e3854] disabled:opacity-40 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Published Project</span>
            </button>
          </div>

          {curatedList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <p className="font-medium text-slate-600">No projects currently featured on the homepage.</p>
              <p>Click &ldquo;Add Published Project&rdquo; to select from your completed contractor portfolio.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {curatedList.map((project, index) => {
                const coverUrl = getCoverUrl(project);
                return (
                  <div
                    key={project.id}
                    className="p-4 flex items-center gap-4 hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Position Badge */}
                    <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold font-mono text-[#172B40] shrink-0">
                      #{index + 1}
                    </div>

                    {/* Thumbnail */}
                    <div className="relative w-16 h-12 rounded-md bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                      <Image
                        src={coverUrl}
                        alt={project.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>

                    {/* Project Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-[#172B40] truncate">
                          {project.title}
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                          {project.category.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                        {project.locationLabel && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{project.locationLabel}</span>
                          </span>
                        )}
                        <span className="text-slate-400 font-mono">slug: /{project.slug}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Move higher on homepage"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(index, "down")}
                        disabled={index === curatedList.length - 1}
                        className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Move lower on homepage"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemove(project.id)}
                        className="p-1.5 rounded-md border border-red-200 hover:bg-red-50 text-red-600 transition-colors"
                        title="Remove from homepage"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Project Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#172B40]">
                  Select Published Project
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Available published projects with verified photos.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto divide-y divide-slate-100">
              {availableToAdd.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  All published projects are already included in the homepage list.
                </div>
              ) : (
                availableToAdd.map((p) => {
                  const coverUrl = getCoverUrl(p);
                  return (
                    <div
                      key={p.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-12 h-9 rounded bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                          <Image
                            src={coverUrl}
                            alt={p.title}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-[#172B40] truncate">
                            {p.title}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {p.category.name}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddProject(p)}
                        className="px-2.5 py-1 text-xs font-semibold text-[#172B40] bg-slate-100 hover:bg-[#172B40] hover:text-white rounded-md transition-colors shrink-0"
                      >
                        Add to Homepage
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Grid Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF9F5] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-slate-300 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#172B40]">
                  Public Homepage Portfolio Simulation
                </h3>
                <p className="text-xs text-slate-500">
                  Visual parity check: exactly how cards render on the live website.
                </p>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-mono"
              >
                ✕ Close Preview
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {curatedList.map((project, idx) => {
                  const coverUrl = getCoverUrl(project);
                  return (
                    <div
                      key={project.id}
                      className="group bg-white rounded-xl overflow-hidden border border-[#E5E0D7] shadow-xs flex flex-col"
                    >
                      <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
                        <Image
                          src={coverUrl}
                          alt={project.title}
                          fill
                          sizes="300px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2.5 left-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wide bg-[#172B40]/80 text-white backdrop-blur-xs uppercase">
                            #{idx + 1} {project.category.name}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-[#172B40] line-clamp-1">
                            {project.title}
                          </h4>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                            {project.shortDescription}
                          </p>
                        </div>
                        {project.locationLabel && (
                          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#B58A58]" />
                            <span>{project.locationLabel}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
