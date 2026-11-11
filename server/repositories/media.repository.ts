import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma, MediaType } from "@prisma/client";

export class MediaRepository {
  async findById(id: string) {
    return prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projectLinks: true },
        },
      },
    });
  }

  async findByPublicId(publicId: string) {
    return prisma.mediaAsset.findUnique({
      where: { publicId },
      include: {
        _count: {
          select: { projectLinks: true },
        },
      },
    });
  }

  async create(data: Prisma.MediaAssetCreateInput) {
    return prisma.mediaAsset.create({
      data,
      include: {
        _count: {
          select: { projectLinks: true },
        },
      },
    });
  }

  async update(id: string, data: Prisma.MediaAssetUpdateInput) {
    return prisma.mediaAsset.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { projectLinks: true },
        },
      },
    });
  }

  async delete(id: string) {
    return prisma.mediaAsset.delete({
      where: { id },
    });
  }

  async countProjectsUsingMedia(id: string): Promise<number> {
    return prisma.projectMedia.count({
      where: { mediaAssetId: id },
    });
  }

  async list(params: {
    q?: string;
    type?: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.MediaAssetWhereInput = {};

    if (params.type && params.type !== "ALL") {
      where.mediaType = params.type as MediaType;
    }

    if (params.q && params.q.trim()) {
      const query = params.q.trim();
      where.OR = [
        { originalName: { contains: query, mode: "insensitive" } },
        { altText: { contains: query, mode: "insensitive" } },
        { caption: { contains: query, mode: "insensitive" } },
        { publicId: { contains: query, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { projectLinks: true },
          },
        },
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    return { items, total };
  }
}

export const mediaRepository = new MediaRepository();

