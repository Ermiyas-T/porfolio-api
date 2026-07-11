import { Controller, Get, Param } from '@nestjs/common';
import { PostsService } from './posts.service';

// Public endpoints for blog posts
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAllPublished() {
    return this.postsService.findAllPublished();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.postsService.findBySlug(slug);
  }

  @Get(':slug/related')
  findRelated(@Param('slug') slug: string) {
    return this.postsService.findRelated(slug);
  }
}
