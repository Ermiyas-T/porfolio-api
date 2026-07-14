import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post, PostStatus } from '@prisma/client';
import { NotFoundException, ConflictException } from '@nestjs/common';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Reading time heuristic: ~200 words per minute, minimum 1 minute
  private computeReadingTime(content: string): number {
    // Strip Markdown syntax before counting words for a more accurate estimate
    const cleanText = content
      .replace(/^#{1,6}\s+/gm, '') // remove heading markers
      .replace(/!\[.*?\]\(.*?\)/g, '') // remove image syntax
      .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // keep link text, drop URL
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // remove inline/code blocks
      .replace(/[*_~]{1,2}([^*_~]+)[*_~]{1,2}/g, '$1'); // keep emphasis text
    const wordCount = cleanText.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }

  async findAllPublished(): Promise<Post[]> {
    return this.prisma.post.findMany({
      where: { status: PostStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
    });
  }

  // Internal lookup used by admin routes and relations — returns any status
  async findBySlug(slug: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({ where: { slug } });
    // Surface 404 early — never return null to the controller
    if (!post) throw new NotFoundException(`Post "${slug}" not found`);
    return post;
  }

  // Public lookup — only returns PUBLISHED posts, never leaks DRAFT content
  async findPublishedBySlug(slug: string): Promise<Post> {
    const post = await this.prisma.post.findFirst({
      where: { slug, status: PostStatus.PUBLISHED },
    });
    if (!post) throw new NotFoundException(`Post "${slug}" not found`);
    return post;
  }

  async findRelated(slug: string): Promise<Post[]> {
    // Source post must be published — don't suggest relations for unpublished content
    const post = await this.findPublishedBySlug(slug);
    // Match same category first, fall back to any published; exclude the current post
    return this.prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        category: post.category,
        slug: { not: slug },
      },
      take: 3,
      orderBy: { publishedAt: 'desc' },
    });
  }

  async findAll(): Promise<Post[]> {
    // Admin-only: return every post regardless of status
    return this.prisma.post.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreatePostDto): Promise<Post> {
    // Guard against duplicate slugs before hitting the DB unique constraint
    const existing = await this.prisma.post.findUnique({
      where: { slug: dto.slug },
    });
    if (existing)
      throw new ConflictException(`Slug "${dto.slug}" is already in use`);

    const readingTime = this.computeReadingTime(dto.content);
    const publishedAt =
      dto.status === PostStatus.PUBLISHED ? new Date() : undefined;

    this.logger.log(`Creating post: ${dto.slug}`);
    return this.prisma.post.create({
      data: {
        ...dto,
        readingTime,
        publishedAt,
      },
    });
  }

  async update(slug: string, dto: UpdatePostDto): Promise<Post> {
    // Verify existence before update so we get a clean 404 rather than a Prisma error
    await this.findBySlug(slug);

    // Guard against slug conflicts when the client requests a rename
    if (dto.slug && dto.slug !== slug) {
      const existing = await this.prisma.post.findUnique({
        where: { slug: dto.slug },
      });
      if (existing)
        throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    }

    const extra: Partial<{ readingTime: number; publishedAt: Date }> = {};
    if (dto.content) {
      extra.readingTime = this.computeReadingTime(dto.content);
    }
    // Set publishedAt only when transitioning to PUBLISHED and it hasn't been set yet
    if (dto.status === PostStatus.PUBLISHED) {
      const current = await this.prisma.post.findUnique({ where: { slug } });
      if (!current!.publishedAt) extra.publishedAt = new Date();
    }

    this.logger.log(`Updating post: ${slug}`);
    return this.prisma.post.update({
      where: { slug },
      data: { ...dto, ...extra },
    });
  }

  async remove(slug: string): Promise<void> {
    await this.findBySlug(slug); // 404 if not found
    this.logger.log(`Deleting post: ${slug}`);
    await this.prisma.post.delete({ where: { slug } });
  }
}
