import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestWithBaseUrl } from '../interfaces/request-with-base-url.interface';

@Injectable()
export class BaseUrlMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
    (req as RequestWithBaseUrl).baseUrlFull = baseUrl;
    next();
  }
}
