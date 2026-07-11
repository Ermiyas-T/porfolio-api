import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Controllers stay thin — only wiring HTTP in/out, all logic lives in PostsService
@ApiTags('Posts')
@Controller()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // ── Public routes ─────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all published posts (public)' })
  @ApiResponse({ status: 200, description: 'Array of published posts' })
  @Get('posts')
  findAllPublished() {
    return this.postsService.findAllPublished();
  }

  @ApiOperation({ summary: 'Get a published post by slug (public)' })
  @ApiResponse({ status: 200, description: 'Post found' })
  @ApiResponse({ status: 404, description: 'Post not found or not published' })
  @Get('posts/:slug')
  findBySlug(@Param('slug') slug: string) {
    // Public route — only returns PUBLISHED posts, never leaks DRAFT content
    return this.postsService.findPublishedBySlug(slug);
  }

  @ApiOperation({ summary: 'Get up to 3 related posts by category (public)' })
  @ApiResponse({ status: 200, description: 'Array of related published posts' })
  @ApiResponse({ status: 404, description: 'Source post not found' })
  @Get('posts/:slug/related')
  findRelated(@Param('slug') slug: string) {
    return this.postsService.findRelated(slug);
  }

  // ── Admin routes — every route below requires a valid JWT ─────────────────

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all posts including drafts (admin)' })
  @ApiResponse({ status: 200, description: 'Array of all posts' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Get('admin/posts')
  findAll() {
    // Returns all posts including DRAFTs — guarded so only admin can access
    return this.postsService.findAll();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post (admin)' })
  @ApiResponse({ status: 201, description: 'Post created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Slug already in use' })
  @UseGuards(JwtAuthGuard)
  @Post('admin/posts')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePostDto) {
    return this.postsService.create(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing post by slug (admin)' })
  @ApiResponse({ status: 200, description: 'Post updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 409, description: 'New slug already in use' })
  @UseGuards(JwtAuthGuard)
  @Patch('admin/posts/:slug')
  update(@Param('slug') slug: string, @Body() dto: UpdatePostDto) {
    return this.postsService.update(slug, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a post by slug (admin)' })
  @ApiResponse({ status: 204, description: 'Post deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @UseGuards(JwtAuthGuard)
  @Delete('admin/posts/:slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('slug') slug: string) {
    return this.postsService.remove(slug);
  }
}
