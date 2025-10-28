import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';

interface CreateMulterOptionsParams {
  destination: string;
  fileFilterRegex: RegExp;
  maxSize: number; // in bytes
}

/**
 * Creates a reusable MulterOptions object.
 * @param params - Configuration parameters.
 * @returns A MulterOptions object.
 */
export function createMulterOptions(
  params: CreateMulterOptionsParams,
): MulterOptions {
  const { destination, fileFilterRegex, maxSize } = params;

  return {
    storage: diskStorage({
      destination: destination,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const extension = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(fileFilterRegex)) {
        return cb(new BadRequestException('Invalid file type.'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: maxSize,
    },
  };
}
