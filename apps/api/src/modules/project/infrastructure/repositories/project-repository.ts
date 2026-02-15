import type { PrismaClient, Project } from '@prisma/client';

export class ProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(userId?: string, userRole?: string): Promise<Project[]> {
    // Admin sees all projects; other roles only see projects they're members of
    if (userRole === 'ADMIN') {
      return this.prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: { cep: true },
      });
    }

    if (userId) {
      return this.prisma.project.findMany({
        where: {
          members: { some: { userId } },
        },
        orderBy: { createdAt: 'desc' },
        include: { cep: true },
      });
    }

    return this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: { cep: true },
    });
  }

  async findById(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        cep: true,
        members: {
          include: { user: true },
        },
      },
    });
  }
}
