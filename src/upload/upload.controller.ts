import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // POST /upload — admin-only image upload to Cloudinary
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      // Keep file in memory buffer — no temp disk writes
      storage: memoryStorage(),
    }),
  )
  upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // 5 MB limit prevents runaway upload abuse
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp|gif)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.uploadService.uploadImage(file);
  }
}
