import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    // Narrow exception type safely
    const err: unknown = exception;

    const isErrorWithMessage = (e: unknown): e is { message: string } =>
      typeof e === 'object' &&
      e !== null &&
      'message' in e &&
      typeof (e as Record<string, unknown>)['message'] === 'string';

    // Handle Multer errors: Unexpected field (too many files)
    if (isErrorWithMessage(err)) {
      if (err.message.includes('Unexpected field')) {
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message:
            'Maximum 4 images can be uploaded at once. Please reduce the number of files and try again.',
        });
      }

      // Handle file size limit errors
      if (err.message.includes('File too large')) {
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'File size exceeds the maximum limit of 5MB per file.',
        });
      }
    }

    // Handle other BadRequestExceptions (Nest exceptions)
    if (exception instanceof BadRequestException) {
      // getResponse() can return many shapes; keep it typed as unknown and pass through
      const exceptionResponse: unknown = exception.getResponse();
      return response
        .status(HttpStatus.BAD_REQUEST)
        .json(exceptionResponse as any);
    }

    // Default error response (safe access)
    const defaultMessage = isErrorWithMessage(err)
      ? err.message
      : 'An unexpected error occurred';

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: defaultMessage,
    });
  }
}
