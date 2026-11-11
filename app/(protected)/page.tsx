import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Briefcase,
  CheckCircle2,
  FileEdit,
  Image as ImageIcon,
  Plus,
  ArrowRight,
  Star,
  Activity,
} from "lucide-react";
import { ContentStatus } from "@prisma/client";

export default async function OverviewDashboardPage() {
  // Query overview metrics safely
  const [totalProjects, publishedProjects, draftProjects, totalMedia, recentProjects, recentActivity] =
    await Promise.all([
      prisma.project.count().catch(() => 0),
      prisma.project.count({ where: { status: ContentStatus.PUBLISHED } }).catch(() => 0),
      prisma.project.count({ where: { status: ContentStatus.DRAFT } }).catch(() => 0),
      prisma.mediaAsset.count().catch(() => 0),
      prisma.project
        .findMany({
          take: 5,
          orderBy: { updatedAt: "desc" },
          include: { category: true },
        })
        .catch(() => []),
      prisma.activityLog
        .findMany({
          take: 6,
          orderBy: { createdAt: "desc" },
          include: { adminUser: true },
        })
        .catch(() => []),
    ]);

  return (
    <div className="space-y-8">
      {/* 1. Page Header with Quick Action */}
      <PageHeader
        title="Dashboard Overview"
        description="Operational metrics, project status breakdown, and recent activity."
        actions={
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#172B40] hover:bg-[#101E2E] rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-[#B58A58]" />
            <span>Create New Project</span>
          </Link>
        }
      />

      {/* 2. Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Projects"
          value={totalProjects}
          subtitle="All portfolio entries"
          icon={<Briefcase className="w-5 h-5 text-[#172B40]" />}
        />
        <StatCard
          title="Published"
          value={publishedProjects}
          subtitle="Live on mamainterior.in"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          trend={{ label: `${publishedProjects} live`, positive: true }}
        />
        <StatCard
          title="Drafts"
          value={draftProjects}
          subtitle="Unpublished or in progress"
          icon={<FileEdit className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title="Media Library"
          value={totalMedia}
          subtitle="Verified Cloudinary assets"
          icon={<ImageIcon className="w-5 h-5 text-indigo-600" />}
        />
      </div>

      {/* 3. Recent Projects & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left: Recent Projects (2 cols on lg) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#172B40]">Recent Projects</h2>
              <p className="text-xs text-slate-500">Most recently modified works</p>
            </div>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#B58A58] hover:text-[#9E7444] transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No projects yet"
                description="Get started by creating your first interior project draft."
                action={{
                  label: "Create Project",
                  href: "/projects/new",
                  icon: <Plus className="w-4 h-4" />,
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Project</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {recentProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {p.isFeatured && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                          )}
                          <span className="font-medium text-[#172B40] truncate max-w-xs block">
                            {p.title}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">/{p.slug}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                          {p.category.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={p.status} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/projects/${p.id}/edit`}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Recent Activity Stream (1 col on lg) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#B58A58]" />
              <h2 className="text-base font-semibold text-[#172B40]">Recent Activity</h2>
            </div>
            <Link
              href="/activity"
              className="text-xs font-semibold text-[#B58A58] hover:text-[#9E7444] transition-colors"
            >
              Full Log
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No recent activity logs.</p>
          ) : (
            <ul className="space-y-4">
              {recentActivity.map((log) => (
                <li key={log.id} className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 font-mono">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-snug">{log.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
