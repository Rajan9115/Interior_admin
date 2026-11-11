"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Hammer,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  Layers,
  FolderGit2,
} from "lucide-react";

interface ServiceItem {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  shortDescription: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  services: ServiceItem[];
  _count: {
    projects: number;
    services: number;
  };
}

export default function ServicesManagementPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Service Modal state
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState<string>("");
  const [serviceFormData, setServiceFormData] = useState({
    title: "",
    slug: "",
    shortDescription: "",
    description: "",
    isActive: true,
    sortOrder: 0,
  });
  const [submittingService, setSubmittingService] = useState(false);
  const [serviceFormError, setServiceFormError] = useState<string | null>(null);

  // Category Edit Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryDescription, setCategoryDescription] = useState("");
  const [submittingCategory, setSubmittingCategory] = useState(false);

  // Delete Service confirmation
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reloadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/services");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load services");
      }
      setCategories(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load services");
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const res = await fetch("/api/v1/admin/services");
        const json = await res.json();
        if (active) {
          if (res.ok && json.success) {
            setCategories(json.data || []);
          } else {
            setError(json.error?.message || "Failed to load services");
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load services");
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

  const openAddServiceModal = (categoryId: string) => {
    setTargetCategoryId(categoryId);
    setEditingService(null);
    setServiceFormData({
      title: "",
      slug: "",
      shortDescription: "",
      description: "",
      isActive: true,
      sortOrder: 0,
    });
    setServiceFormError(null);
    setIsServiceModalOpen(true);
  };

  const openEditServiceModal = (service: ServiceItem) => {
    setTargetCategoryId(service.categoryId);
    setEditingService(service);
    setServiceFormData({
      title: service.title,
      slug: service.slug,
      shortDescription: service.shortDescription,
      description: service.description || "",
      isActive: service.isActive,
      sortOrder: service.sortOrder,
    });
    setServiceFormError(null);
    setIsServiceModalOpen(true);
  };

  const handleServiceTitleChange = (val: string) => {
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    setServiceFormData((prev) => ({
      ...prev,
      title: val,
      slug: editingService ? prev.slug : autoSlug,
    }));
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setServiceFormError(null);
    setSubmittingService(true);

    try {
      const url = editingService
        ? `/api/v1/admin/services/${editingService.id}`
        : "/api/v1/admin/services";
      const method = editingService ? "PATCH" : "POST";

      const payload = {
        categoryId: targetCategoryId,
        title: serviceFormData.title,
        slug: serviceFormData.slug,
        shortDescription: serviceFormData.shortDescription,
        description: serviceFormData.description || null,
        isActive: serviceFormData.isActive,
        sortOrder: Number(serviceFormData.sortOrder),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save service");
      }

      setIsServiceModalOpen(false);
      showToast(editingService ? "Service updated successfully" : "Service created successfully");
      await reloadCategories();
    } catch (err) {
      setServiceFormError(err instanceof Error ? err.message : "Failed to save service");
    } finally {
      setSubmittingService(false);
    }
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/v1/admin/services/${serviceToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to delete service");
      }

      setServiceToDelete(null);
      showToast("Service deleted successfully");
      await reloadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete service");
    } finally {
      setDeleting(false);
    }
  };

  const handleMoveService = async (
    category: CategoryItem,
    serviceIndex: number,
    direction: "up" | "down"
  ) => {
    const targetIndex = direction === "up" ? serviceIndex - 1 : serviceIndex + 1;
    if (targetIndex < 0 || targetIndex >= category.services.length) return;

    const reorderedList = [...category.services];
    const temp = reorderedList[serviceIndex];
    reorderedList[serviceIndex] = reorderedList[targetIndex];
    reorderedList[targetIndex] = temp;

    const items = reorderedList.map((svc, idx) => ({
      id: svc.id,
      sortOrder: idx,
    }));

    try {
      const res = await fetch("/api/v1/admin/services/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to reorder");
      }
      showToast("Order saved");
      await reloadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reorder");
    }
  };

  const openEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCategoryDescription(cat.description || "");
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setSubmittingCategory(true);

    try {
      const res = await fetch(`/api/v1/admin/services/categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: categoryDescription }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update category");
      }
      setIsCategoryModalOpen(false);
      showToast(`Category "${editingCategory.name}" updated`);
      await reloadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setSubmittingCategory(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Services & Trade Disciplines"
        description="The four primary contractor disciplines and technical specializations."
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

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-[#B58A58] mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading trade disciplines & services...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden"
            >
              {/* Category Header Card */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#172B40] shadow-2xs">
                      <Hammer className="w-5 h-5 text-[#B58A58]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-[#172B40]">{cat.name}</h2>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Core Protected
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">slug: /{cat.slug}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => openEditCategory(cat)}
                    className="p-1.5 rounded-md hover:bg-slate-200/60 text-slate-500 transition-colors text-xs flex items-center gap-1"
                    title="Edit category description"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  {cat.description || "Core trade specialization for turnkey interior execution."}
                </p>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cat._count.projects} projects linked</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cat.services.length} services</span>
                  </span>
                </div>
              </div>

              {/* Services List */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                      Specialized Offerings
                    </h3>
                    <button
                      onClick={() => openAddServiceModal(cat.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#172B40] bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Service</span>
                    </button>
                  </div>

                  {cat.services.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                      No specialized services added under this category yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {cat.services.map((svc, idx) => (
                        <div
                          key={svc.id}
                          className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-semibold text-[#172B40] truncate">
                                {svc.title}
                              </h4>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-sm ${
                                  svc.isActive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {svc.isActive ? "Active" : "Hidden"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {svc.shortDescription}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Reorder Up */}
                            <button
                              onClick={() => handleMoveService(cat, idx, "up")}
                              disabled={idx === 0}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            {/* Reorder Down */}
                            <button
                              onClick={() => handleMoveService(cat, idx, "down")}
                              disabled={idx === cat.services.length - 1}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            {/* Edit */}
                            <button
                              onClick={() => openEditServiceModal(svc)}
                              className="p-1 rounded text-slate-400 hover:text-blue-600"
                              title="Edit service"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => setServiceToDelete(svc)}
                              className="p-1 rounded text-slate-400 hover:text-red-600"
                              title="Delete service"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#172B40]">
                {editingService ? "Edit Service" : "Add New Specialized Service"}
              </h3>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-6 space-y-4">
              {serviceFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                  {serviceFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Service Title *
                </label>
                <input
                  type="text"
                  required
                  value={serviceFormData.title}
                  onChange={(e) => handleServiceTitleChange(e.target.value)}
                  placeholder="e.g. Concealed Conduit & House Wiring"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={serviceFormData.slug}
                  onChange={(e) =>
                    setServiceFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase().trim() }))
                  }
                  placeholder="e.g. concealed-conduit-house-wiring"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Short Description * (Summary for cards & lists)
                </label>
                <textarea
                  required
                  rows={2}
                  value={serviceFormData.shortDescription}
                  onChange={(e) =>
                    setServiceFormData((prev) => ({ ...prev, shortDescription: e.target.value }))
                  }
                  placeholder="Brief 1-2 sentence overview of scope..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Detailed Scope & Specifications (Optional)
                </label>
                <textarea
                  rows={3}
                  value={serviceFormData.description}
                  onChange={(e) =>
                    setServiceFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Technical workflow, materials used, inspection criteria..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={serviceFormData.isActive}
                    onChange={(e) =>
                      setServiceFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="w-4 h-4 text-[#B58A58] rounded border-slate-300 focus:ring-[#B58A58]"
                  />
                  <span>Active & visible on public site</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsServiceModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingService}
                    className="px-4 py-1.5 text-xs font-semibold bg-[#172B40] text-white rounded-lg hover:bg-[#1e3854] disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                  >
                    {submittingService && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingService ? "Save Changes" : "Create Service"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {isCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#172B40]">
                Edit Discipline: {editingCategory.name}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Discipline Name (Architecturally Protected)
                </label>
                <input
                  type="text"
                  disabled
                  value={editingCategory.name}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-medium cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Public Overview Description
                </label>
                <textarea
                  rows={4}
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Comprehensive description of trade craftsmanship..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCategory}
                  className="px-4 py-1.5 text-xs font-semibold bg-[#172B40] text-white rounded-lg hover:bg-[#1e3854] disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                >
                  {submittingCategory && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Description</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Service Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(serviceToDelete)}
        title="Delete Specialized Service?"
        message={`Are you sure you want to delete "${serviceToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Service"
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDeleteService}
        onCancel={() => setServiceToDelete(null)}
      />
    </div>
  );
}
