import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly configService: ConfigService) {
    // Configure Cloudinary from env vars — do this once at service construction
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('No file provided');

    const url = await new Promise<string>((resolve, reject) => {
      // Stream the buffer directly to Cloudinary — avoids writing temp files to disk
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'portfolio-blog', resource_type: 'image' },
        (error: Error | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result.secure_url);
        },
      );
      Readable.from(file.buffer).pipe(uploadStream);
    });

    this.logger.log(`Image uploaded: ${url}`);
    return { url };
  }
}
