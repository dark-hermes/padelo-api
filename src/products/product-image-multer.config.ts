import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

/**
 * Creates multer options for product images with variant-specific folders
 */
export function createProductImageMulterOptions(): MulterOptions {
  return {
    storage: diskStorage({
      destination: (req, file, cb) => {
        // Get variantId from URL params
        const variantId = req.params?.variantId;
        if (!variantId) {
          return cb(
            new BadRequestException('Product variant ID is required'),
            '',
          );
        }

        const uploadPath = join('uploads', 'products', variantId);

        // Create directory if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });

        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const extension = extname(file.originalname);
        cb(null, `product-${uniqueSuffix}${extension}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
        return cb(
          new BadRequestException(
            'Invalid file type. Only JPG, JPEG, PNG, and WebP files are allowed.',
          ),
          false,
        );
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  };
}
