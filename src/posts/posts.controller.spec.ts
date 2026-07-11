import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

describe('PostsController', () => {
  let controller: PostsController;

  const mockPostsService = {
    findAllPublished: jest.fn(),
    findPublishedBySlug: jest.fn(),
    findRelated: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        { provide: PostsService, useValue: mockPostsService },
        { provide: Reflector, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PostsController>(PostsController);
    jest.clearAllMocks();
  });

  describe('public routes', () => {
    it('GET /posts calls findAllPublished', async () => {
      mockPostsService.findAllPublished.mockResolvedValue([]);
      await controller.findAllPublished();
      expect(mockPostsService.findAllPublished).toHaveBeenCalled();
    });

    it('GET /posts/:slug calls findPublishedBySlug', async () => {
      mockPostsService.findPublishedBySlug.mockResolvedValue({ slug: 'test' });
      await controller.findBySlug('test');
      expect(mockPostsService.findPublishedBySlug).toHaveBeenCalledWith('test');
    });

    it('GET /posts/:slug/related calls findRelated', async () => {
      mockPostsService.findRelated.mockResolvedValue([]);
      await controller.findRelated('test');
      expect(mockPostsService.findRelated).toHaveBeenCalledWith('test');
    });
  });

  describe('admin routes - JwtAuthGuard metadata', () => {
    it('GET /admin/posts has JwtAuthGuard applied', () => {
      const guards = Reflect.getMetadata('__guards__', PostsController.prototype.findAll);
      expect(guards).toBeDefined();
    });

    it('POST /admin/posts has JwtAuthGuard applied', () => {
      const guards = Reflect.getMetadata('__guards__', PostsController.prototype.create);
      expect(guards).toBeDefined();
    });

    it('PATCH /admin/posts/:slug has JwtAuthGuard applied', () => {
      const guards = Reflect.getMetadata('__guards__', PostsController.prototype.update);
      expect(guards).toBeDefined();
    });

    it('DELETE /admin/posts/:slug has JwtAuthGuard applied', () => {
      const guards = Reflect.getMetadata('__guards__', PostsController.prototype.remove);
      expect(guards).toBeDefined();
    });
  });
});
