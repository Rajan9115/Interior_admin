import React from "react";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Hammer } from "lucide-react";

export default async function ServicesManagementPage() {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services & Trade Disciplines"
        description="The four primary contractor disciplines and technical specializations."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-50 text-[#172B40]">
                  <Hammer className="w-5 h-5 text-[#B58A58]" />
                </div>
                <h2 className="text-base font-semibold text-[#172B40]">{cat.name}</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {cat.description || "Core trade specialization."}
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Slug: /{cat.slug}</span>
              <span>Order: #{cat.sortOrder}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
