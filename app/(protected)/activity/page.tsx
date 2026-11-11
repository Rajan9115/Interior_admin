import React from "react";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { History, Shield, FileText } from "lucide-react";

export default async function ActivityLogPage() {
  const logs = await prisma.activityLog
    .findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: { adminUser: true },
    })
    .catch(() => []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity & Audit Trail"
        description="Chronological log of administrative actions, logins, and project mutations."
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p>No activity records logged yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-mono font-medium">
                        {log.action.includes("LOGIN") || log.action.includes("LOGOUT") ? (
                          <Shield className="w-3 h-3 text-[#B58A58]" />
                        ) : (
                          <FileText className="w-3 h-3 text-slate-500" />
                        )}
                        <span>{log.action.replace(/_/g, " ")}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 max-w-md">
                      {log.summary}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {log.adminUser?.email || "System"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
