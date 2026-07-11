import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Post } from '@prisma/client';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Reading time heuristic: ~200 words per minute, minimum 1 minute
  computeReadingTime(content: string): number {
    const wordCount = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }

  async findAllPublished(): Promise<Post[]> {
    return this.prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async findBySlug(slug: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({ where: { slug } });
    if (!post) throw new NotFoundException(`Post "${slug}" not found`);
    return post;
  }

  async findRelated(slug: string): Promise<Post[]> {
    const post = await this.findBySlug(slug);
    return this.prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        category: post.category,
        slug: { not: slug },
      },
      take: 3,
      orderBy: { publishedAt: 'desc' },
    });
  }
}
