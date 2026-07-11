import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsUrl,
  Matches,
} from 'class-validator';
import { PostStatus } from '@prisma/client';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  // slug must be URL-safe: lowercase letters, digits, hyphens only
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric with hyphens only',
  })
  slug: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  // Markdown only — the frontend TipTap editor serialises to Markdown before sending
  content: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsOptional()
  @IsUrl()
  coverImage?: string;

  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;
}
