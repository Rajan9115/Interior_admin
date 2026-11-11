import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sparkles, Home } from "lucide-react";

export default function HomepageManagerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Homepage Featured Projects"
        description="Curate and order projects showcased on the public website home page."
      />

      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Homepage Featured Controls Scheduled for Phase 7</p>
          <p className="text-xs text-amber-800 mt-1">
            Toggle the &ldquo;Feature on Homepage&rdquo; checkbox in any project to include it in the homepage selection. Drag-and-drop reordering will activate in Phase 7.
          </p>
        </div>
      </div>

      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <Home className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-[#172B40]">Homepage Curation Hub</p>
        <p className="text-xs text-slate-500 mt-1">Manage approved hero and trust strip copy fields.</p>
      </div>
    </div>
  );
}

