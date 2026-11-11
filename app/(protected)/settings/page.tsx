"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Settings,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Search,
} from "lucide-react";

interface SettingsFormState {
  business_name: string;
  tagline: string;
  hero_title: string;
  hero_description: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  service_areas: string;
  hours: string;
  gstin: string;
  seo_defaults: {
    metaTitleSuffix: string;
    defaultDescription: string;
  };
}

const DEFAULT_SETTINGS_STATE: SettingsFormState = {
  business_name: "MAMA INTERIOR",
  tagline: "Turnkey interior contractor & multi-trade craftsmanship.",
  hero_title: "Precision Multi-Trade Contracting For Modern Living Spaces.",
  hero_description:
    "Direct craftsman-led execution across Electrical, Carpentry, Painting, and False Ceiling. No intermediaries. Full personal accountability.",
  phone: "+91 80818 70179",
  whatsapp: "+91 80818 70179",
  email: "contact@mamainterior.in",
  address: "Metro Area, India",
  service_areas: "Greater Metro & Surrounding Districts",
  hours: "Mon – Sat: 9:00 AM – 7:30 PM",
  gstin: "",
  seo_defaults: {
    metaTitleSuffix: "| MAMA INTERIOR Contractors",
    defaultDescription:
      "MAMA INTERIOR is an authentic turnkey interior execution contractor specializing in electrical, carpentry, false ceiling, and painting.",
  },
};

export default function SettingsPage() {
  const [formData, setFormData] = useState<SettingsFormState>(DEFAULT_SETTINGS_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const reloadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/settings");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load settings");
      }

      const remote = json.data || {};
      setFormData({
        business_name: remote.business_name || DEFAULT_SETTINGS_STATE.business_name,
        tagline: remote.tagline || DEFAULT_SETTINGS_STATE.tagline,
        hero_title: remote.hero_title || DEFAULT_SETTINGS_STATE.hero_title,
        hero_description: remote.hero_description || DEFAULT_SETTINGS_STATE.hero_description,
        phone: remote.phone || DEFAULT_SETTINGS_STATE.phone,
        whatsapp: remote.whatsapp || DEFAULT_SETTINGS_STATE.whatsapp,
        email: remote.email || DEFAULT_SETTINGS_STATE.email,
        address: remote.address || DEFAULT_SETTINGS_STATE.address,
        service_areas: remote.service_areas || DEFAULT_SETTINGS_STATE.service_areas,
        hours: remote.hours || DEFAULT_SETTINGS_STATE.hours,
        gstin: remote.gstin || "",
        seo_defaults: {
          metaTitleSuffix:
            remote.seo_defaults?.metaTitleSuffix ||
            DEFAULT_SETTINGS_STATE.seo_defaults.metaTitleSuffix,
          defaultDescription:
            remote.seo_defaults?.defaultDescription ||
            DEFAULT_SETTINGS_STATE.seo_defaults.defaultDescription,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const res = await fetch("/api/v1/admin/settings");
        const json = await res.json();
        if (active) {
          if (res.ok && json.success) {
            const remote = json.data || {};
            setFormData({
              business_name: remote.business_name || DEFAULT_SETTINGS_STATE.business_name,
              tagline: remote.tagline || DEFAULT_SETTINGS_STATE.tagline,
              hero_title: remote.hero_title || DEFAULT_SETTINGS_STATE.hero_title,
              hero_description: remote.hero_description || DEFAULT_SETTINGS_STATE.hero_description,
              phone: remote.phone || DEFAULT_SETTINGS_STATE.phone,
              whatsapp: remote.whatsapp || DEFAULT_SETTINGS_STATE.whatsapp,
              email: remote.email || DEFAULT_SETTINGS_STATE.email,
              address: remote.address || DEFAULT_SETTINGS_STATE.address,
              service_areas: remote.service_areas || DEFAULT_SETTINGS_STATE.service_areas,
              hours: remote.hours || DEFAULT_SETTINGS_STATE.hours,
              gstin: remote.gstin || "",
              seo_defaults: {
                metaTitleSuffix:
                  remote.seo_defaults?.metaTitleSuffix ||
                  DEFAULT_SETTINGS_STATE.seo_defaults.metaTitleSuffix,
                defaultDescription:
                  remote.seo_defaults?.defaultDescription ||
                  DEFAULT_SETTINGS_STATE.seo_defaults.defaultDescription,
              },
            });
          } else {
            setError(json.error?.message || "Failed to load settings");
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load settings");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update settings");
      }

      showToast("Business and site settings saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Business & Site Settings"
        description="Verified contractor credentials, direct contact channels, and SEO defaults."
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

      {/* Security Architecture Callout */}
      <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-blue-950">Architectural Allowlist Protection</p>
          <p className="text-blue-800">
            Settings are strictly constrained to allowlisted fields.
            Arbitrary scripts, unverified URLs, or unauthorized layout alterations are rejected server-side to guarantee client safety.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-[#B58A58] mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading contractor settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Brand Identity */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-2 border-b border-slate-100 pb-3">
              <Settings className="w-4 h-4 text-[#B58A58]" />
              <span>Contractor Identity & Hero Headline</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Business / Trading Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.business_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, business_name: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Short Tagline
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tagline: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Approved Hero Headline
              </label>
              <input
                type="text"
                value={formData.hero_title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, hero_title: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Hero Subtitle / Value Proposition
              </label>
              <textarea
                rows={2}
                value={formData.hero_description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, hero_description: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
              />
            </div>
          </div>

          {/* 2. Direct Contact Channels */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-2 border-b border-slate-100 pb-3">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Direct Authentic Contact Channels</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Direct Phone *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Direct WhatsApp Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.whatsapp}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, whatsapp: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contractor Email *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Physical Operations & Hours */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Location, Coverage & Operating Hours</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Physical Workshop / Office Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Service Execution Areas
                </label>
                <input
                  type="text"
                  value={formData.service_areas}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, service_areas: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Contractor Working Hours</span>
                </label>
                <input
                  type="text"
                  value={formData.hours}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, hours: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>GSTIN / Tax ID (Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, gstin: e.target.value }))
                  }
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>
            </div>
          </div>

          {/* 4. SEO Defaults */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-2 border-b border-slate-100 pb-3">
              <Search className="w-4 h-4 text-purple-600" />
              <span>Search Engine Optimization (SEO) Defaults</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Meta Title Suffix
                </label>
                <input
                  type="text"
                  value={formData.seo_defaults.metaTitleSuffix}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      seo_defaults: { ...prev.seo_defaults, metaTitleSuffix: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Default Meta Description
                </label>
                <textarea
                  rows={2}
                  value={formData.seo_defaults.defaultDescription}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      seo_defaults: {
                        ...prev.seo_defaults,
                        defaultDescription: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A58]/30 focus:border-[#B58A58]"
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={reloadSettings}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg"
            >
              Reset to Saved
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-xs font-semibold bg-[#172B40] text-white rounded-lg hover:bg-[#1e3854] disabled:opacity-50 flex items-center gap-2 shadow-2xs"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Business Settings</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
