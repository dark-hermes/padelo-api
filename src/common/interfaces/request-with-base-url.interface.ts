import { Request } from 'express';

export interface RequestWithBaseUrl extends Request {
  baseUrl: string;
  baseUrlFull: string;
}
