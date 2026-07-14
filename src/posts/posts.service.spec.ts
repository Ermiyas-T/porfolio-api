import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { PostStatus } from '@prisma/client';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('PostsService', () => {
  let service: PostsService;
  let prisma: PrismaService;

  const mockPrisma = {
    post: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('findAllPublished', () => {
    it('returns only published posts ordered by publishedAt desc', async () => {
      const posts = [
        {
          id: '1',
          slug: 'post-2',
          status: PostStatus.PUBLISHED,
          publishedAt: new Date('2024-01-02'),
        },
        {
          id: '2',
          slug: 'post-1',
          status: PostStatus.PUBLISHED,
          publishedAt: new Date('2024-01-01'),
        },
      ];
      mockPrisma.post.findMany.mockResolvedValue(posts);

      const result = await service.findAllPublished();

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        where: { status: PostStatus.PUBLISHED },
        orderBy: { publishedAt: 'desc' },
      });
      expect(result).toEqual(posts);
    });
  });

  describe('findBySlug', () => {
    it('returns a post when found regardless of status', async () => {
      const post = { id: '1', slug: 'my-post', status: PostStatus.DRAFT };
      mockPrisma.post.findUnique.mockResolvedValue(post);

      const result = await service.findBySlug('my-post');

      expect(result).toEqual(post);
    });

    it('throws NotFoundException when post does not exist', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findPublishedBySlug', () => {
    it('returns a post when found with PUBLISHED status', async () => {
      const post = { id: '1', slug: 'my-post', status: PostStatus.PUBLISHED };
      mockPrisma.post.findFirst.mockResolvedValue(post);

      const result = await service.findPublishedBySlug('my-post');

      expect(mockPrisma.post.findFirst).toHaveBeenCalledWith({
        where: { slug: 'my-post', status: PostStatus.PUBLISHED },
      });
      expect(result).toEqual(post);
    });

    it('throws NotFoundException for DRAFT posts', async () => {
      mockPrisma.post.findFirst.mockResolvedValue(null);

      await expect(service.findPublishedBySlug('draft-post')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findRelated', () => {
    it('returns up to 3 related published posts in same category', async () => {
      const post = {
        id: '1',
        slug: 'current',
        category: 'tech',
        status: PostStatus.PUBLISHED,
      };
      const related = [
        { id: '2', slug: 'related-1', category: 'tech' },
        { id: '3', slug: 'related-2', category: 'tech' },
      ];
      mockPrisma.post.findFirst.mockResolvedValue(post);
      mockPrisma.post.findMany.mockResolvedValue(related);

      const result = await service.findRelated('current');

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        where: {
          status: PostStatus.PUBLISHED,
          category: 'tech',
          slug: { not: 'current' },
        },
        take: 3,
        orderBy: { publishedAt: 'desc' },
      });
      expect(result).toEqual(related);
    });

    it('throws NotFoundException when source post is not published', async () => {
      mockPrisma.post.findFirst.mockResolvedValue(null);

      await expect(service.findRelated('draft-post')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('returns all posts ordered by createdAt desc', async () => {
      const posts = [
        { id: '1', slug: 'post-1' },
        { id: '2', slug: 'post-2' },
      ];
      mockPrisma.post.findMany.mockResolvedValue(posts);

      const result = await service.findAll();

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(posts);
    });
  });

  describe('create', () => {
    const createDto = {
      slug: 'new-post',
      title: 'New Post',
      description: 'A new post',
      content: 'Hello world this is a test post content here',
      category: 'tech',
      tags: ['nestjs'],
      featured: false,
    };

    it('creates a post with computed readingTime', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);
      mockPrisma.post.create.mockResolvedValue({
        ...createDto,
        id: '1',
        readingTime: 1,
        status: PostStatus.DRAFT,
      });

      const result = await service.create(createDto);

      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...createDto,
          readingTime: 1,
          publishedAt: undefined,
        }),
      });
      expect(result.readingTime).toBe(1);
    });

    it('sets publishedAt when status is PUBLISHED', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);
      mockPrisma.post.create.mockResolvedValue({
        ...createDto,
        id: '1',
        status: PostStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      });

      await service.create({ ...createDto, status: PostStatus.PUBLISHED });

      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          publishedAt: expect.any(Date),
        }),
      });
    });

    it('preserves fenced code block language metadata', async () => {
      const markdownWithLanguage = [
        '# Typed example',
        '',
        '```tsx',
        'const label: string = "Save";',
        '```',
      ].join('\n');
      const dto = { ...createDto, content: markdownWithLanguage };
      mockPrisma.post.findUnique.mockResolvedValue(null);
      mockPrisma.post.create.mockResolvedValue({
        ...dto,
        id: '1',
        readingTime: 1,
        status: PostStatus.DRAFT,
      });

      await service.create(dto);

      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: markdownWithLanguage,
        }),
      });
    });

    it('throws ConflictException when slug already exists', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'existing',
        slug: 'new-post',
      });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.post.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const existingPost = {
      id: '1',
      slug: 'my-post',
      title: 'Old Title',
      publishedAt: null,
    };

    it('updates a post successfully', async () => {
      const updateDto = { title: 'New Title' };
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.post.update.mockResolvedValue({
        ...existingPost,
        ...updateDto,
      });

      const result = await service.update('my-post', updateDto);

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { slug: 'my-post' },
        data: { ...updateDto },
      });
      expect(result.title).toBe('New Title');
    });

    it('throws NotFoundException when post does not exist', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { title: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when new slug conflicts with existing post', async () => {
      mockPrisma.post.findUnique
        .mockResolvedValueOnce(existingPost) // first call: findBySlug
        .mockResolvedValueOnce({ id: '2', slug: 'taken-slug' }); // second call: conflict check

      await expect(
        service.update('my-post', { slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.post.update).not.toHaveBeenCalled();
    });

    it('does not check slug conflict when slug is unchanged', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce(existingPost); // findBySlug
      mockPrisma.post.update.mockResolvedValue(existingPost);

      await service.update('my-post', { slug: 'my-post' });

      // Only called for findBySlug — slug unchanged so no conflict check,
      // and status is not PUBLISHED so no publishedAt check
      expect(mockPrisma.post.findUnique).toHaveBeenCalledTimes(1);
    });

    it('recomputes readingTime when content changes', async () => {
      const updateDto = { content: 'word '.repeat(400) }; // ~400 words
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.post.update.mockResolvedValue({
        ...existingPost,
        ...updateDto,
        readingTime: 2,
      });

      await service.update('my-post', updateDto);

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { slug: 'my-post' },
        data: expect.objectContaining({ readingTime: 2 }),
      });
    });

    it('preserves code block language metadata when content changes', async () => {
      const markdownWithLanguage = [
        '# Updated example',
        '',
        '```typescript',
        'type Status = "draft" | "published";',
        '```',
      ].join('\n');
      const updateDto = { content: markdownWithLanguage };
      mockPrisma.post.findUnique.mockResolvedValue(existingPost);
      mockPrisma.post.update.mockResolvedValue({
        ...existingPost,
        ...updateDto,
        readingTime: 1,
      });

      await service.update('my-post', updateDto);

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { slug: 'my-post' },
        data: expect.objectContaining({
          content: markdownWithLanguage,
        }),
      });
    });

    it('sets publishedAt when transitioning from DRAFT to PUBLISHED', async () => {
      mockPrisma.post.findUnique
        .mockResolvedValueOnce(existingPost) // findBySlug
        .mockResolvedValueOnce(existingPost); // current post for publishedAt check (publishedAt is null)
      mockPrisma.post.update.mockResolvedValue({
        ...existingPost,
        status: PostStatus.PUBLISHED,
      });

      await service.update('my-post', { status: PostStatus.PUBLISHED });

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { slug: 'my-post' },
        data: expect.objectContaining({ publishedAt: expect.any(Date) }),
      });
    });
  });

  describe('remove', () => {
    it('deletes a post when it exists', async () => {
      const post = { id: '1', slug: 'my-post' };
      mockPrisma.post.findUnique.mockResolvedValue(post);
      mockPrisma.post.delete.mockResolvedValue(post);

      await service.remove('my-post');

      expect(mockPrisma.post.delete).toHaveBeenCalledWith({
        where: { slug: 'my-post' },
      });
    });

    it('throws NotFoundException when post does not exist', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.post.delete).not.toHaveBeenCalled();
    });
  });
});
