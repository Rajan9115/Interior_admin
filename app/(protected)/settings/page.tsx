import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Settings, Phone, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business & Site Settings"
        description="Verified contractor credentials and public contact information."
      />

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        <h2 className="text-base font-semibold text-[#172B40] border-b border-slate-100 pb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#B58A58]" />
          <span>Active Business Profile</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-500 block uppercase font-mono">Business Name</span>
            <span className="font-semibold text-[#172B40] mt-1 block">MAMA INTERIOR</span>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-500 block uppercase font-mono">Market / Area</span>
            <span className="font-semibold text-[#172B40] mt-1 block">Metro Area, India</span>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-500 block uppercase font-mono flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified WhatsApp & Phone</span>
            </span>
            <span className="font-semibold text-[#172B40] mt-1 block">+91 80818 70179</span>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-500 block uppercase font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Security Model</span>
            </span>
            <span className="font-semibold text-[#172B40] mt-1 block">Single Owner Session (HttpOnly)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

