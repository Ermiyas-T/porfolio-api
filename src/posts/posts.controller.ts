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
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Controllers stay thin — only wiring HTTP in/out, all logic lives in PostsService
@Controller()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // ── Public routes ─────────────────────────────────────────────────────────

  @Get('posts')
  findAllPublished() {
    return this.postsService.findAllPublished();
  }

  @Get('posts/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.postsService.findBySlug(slug);
  }

  @Get('posts/:slug/related')
  findRelated(@Param('slug') slug: string) {
    return this.postsService.findRelated(slug);
  }

  // ── Admin routes — every route below requires a valid JWT ─────────────────

  @UseGuards(JwtAuthGuard)
  @Get('admin/posts')
  findAll() {
    // Returns all posts including DRAFTs — guarded so only admin can access
    return this.postsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/posts')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePostDto) {
    return this.postsService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/posts/:slug')
  update(@Param('slug') slug: string, @Body() dto: UpdatePostDto) {
    return this.postsService.update(slug, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/posts/:slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('slug') slug: string) {
    return this.postsService.remove(slug);
  }
}
