import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';

// All fields optional on update — reuse CreatePostDto validation decorators
export class UpdatePostDto extends PartialType(CreatePostDto) {}
