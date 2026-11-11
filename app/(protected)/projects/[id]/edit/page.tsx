import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ExternalLink } from "lucide-react";
import { ContentStatus } from "@prisma/client";

interface EditProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;

  const [project, categories] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        category: true,
        highlights: { orderBy: { sortOrder: "asc" } },
        media: {
          include: { mediaAsset: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  if (!project) {
    notFound();
  }

  const initialData = {
    id: project.id,
    title: project.title,
    slug: project.slug,
    categoryId: project.categoryId,
    locationLabel: project.locationLabel,
    shortDescription: project.shortDescription,
    description: project.description,
    completionDate: project.completionDate ? project.completionDate.toISOString() : undefined,
    isFeatured: project.isFeatured,
    status: project.status,
    seoTitle: project.seoTitle,
    seoDescription: project.seoDescription,
    highlights: project.highlights.map((h) => h.text),
    media: project.media,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${project.title}`}
        description={`Last updated on ${new Date(project.updatedAt).toLocaleDateString("en-IN", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}`}
        backHref="/projects"
        backLabel="All Projects"
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={project.status} />
            {project.status === ContentStatus.PUBLISHED && (
              <a
                href={`https://mamainterior.in/projects/${project.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span>View Live</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        }
      />

      <ProjectForm initialData={initialData} categories={categories} isEditing />
    </div>
  );
}
