import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Plus,
  Search,
  Star,
  ExternalLink,
  Edit2,
  Filter,
} from "lucide-react";
import { ContentStatus, Prisma } from "@prisma/client";

interface ProjectsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function ProjectsListPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const categorySlug = params.category || "";
  const statusFilter = params.status as ContentStatus | undefined;
  const page = Math.max(parseInt(params.page || "1", 10), 1);
  const pageSize = 15;
  const skip = (page - 1) * pageSize;

  // Build filter where query
  const where: Prisma.ProjectWhereInput = {};

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  if (statusFilter && Object.values(ContentStatus).includes(statusFilter)) {
    where.status = statusFilter;
  }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { slug: { contains: query, mode: "insensitive" } },
      { shortDescription: { contains: query, mode: "insensitive" } },
      { locationLabel: { contains: query, mode: "insensitive" } },
    ];
  }

  const [categories, total, projects] = await Promise.all([
    prisma.serviceCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }).catch(() => []),
    prisma.project.count({ where }).catch(() => 0),
    prisma.project
      .findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ updatedAt: "desc" }],
        include: {
          category: true,
          media: {
            where: { role: "COVER" },
            include: { mediaAsset: true },
            take: 1,
          },
        },
      })
      .catch(() => []),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <PageHeader
        title="Project Management"
        description="Create, edit, preview, and organize contractor projects for the portfolio."
        actions={
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#172B40] hover:bg-[#101E2E] rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-[#B58A58]" />
            <span>New Project</span>
          </Link>
        }
      />

      {/* 2. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by title, location or keywords..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-[#172B40] placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#B58A58] focus:ring-1 focus:ring-[#B58A58]"
            />
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              name="category"
              defaultValue={categorySlug}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              name="status"
              defaultValue={statusFilter || ""}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-[#172B40] focus:bg-white focus:outline-hidden focus:border-[#B58A58]"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#172B40] hover:bg-[#101E2E] rounded-lg transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
            {(query || categorySlug || statusFilter) && (
              <Link
                href="/projects"
                className="px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Reset filters"
              >
                Clear
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* 3. Projects Table or Empty State */}
      {projects.length === 0 ? (
        <EmptyState
          title="No projects match your filter"
          description={
            query || categorySlug || statusFilter
              ? "Try adjusting your search query or filter settings."
              : "Start by creating your first portfolio project."
          }
          action={{
            label: "Create Project",
            href: "/projects/new",
            icon: <Plus className="w-4 h-4" />,
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Project Details</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Location</th>
                  <th className="px-4 py-3.5">Last Updated</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {projects.map((p) => {
                  const cover = p.media[0]?.mediaAsset;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          {/* Thumbnail / Placeholder */}
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 font-mono text-[10px]">
                            {cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={cover.secureUrl}
                                alt={cover.altText || p.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>No img</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              {p.isFeatured && (
                                <span title="Featured on Homepage">
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                                </span>
                              )}
                              <Link
                                href={`/projects/${p.id}/edit`}
                                className="font-semibold text-[#172B40] hover:text-[#B58A58] transition-colors"
                              >
                                {p.title}
                              </Link>
                            </div>
                            <span className="block text-xs text-slate-400 font-mono">
                              /{p.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                          {p.category.name}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={p.status} size="sm" />
                      </td>

                      <td className="px-4 py-4 text-xs text-slate-500">
                        {p.locationLabel || "—"}
                      </td>

                      <td className="px-4 py-4 text-xs text-slate-400">
                        {new Date(p.updatedAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.status === ContentStatus.PUBLISHED && (
                            <a
                              href={`https://mamainterior.in/projects/${p.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#172B40] hover:bg-slate-100 transition-colors"
                              title="View on Public Website"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <Link
                            href={`/projects/${p.id}/edit`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Edit</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 4. Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {skip + 1} to {Math.min(skip + pageSize, total)} of {total} projects
              </span>
              <div className="flex items-center gap-1.5">
                {page > 1 && (
                  <Link
                    href={`/projects?page=${page - 1}${categorySlug ? `&category=${categorySlug}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}${query ? `&q=${query}` : ""}`}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    Previous
                  </Link>
                )}
                <span className="px-2 font-mono">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/projects?page=${page + 1}${categorySlug ? `&category=${categorySlug}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}${query ? `&q=${query}` : ""}`}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
