import { Injectable } from '@nestjs/common';
import {
  JwtSignOptions,
  JwtVerifyOptions,
  JwtService as NestJwtService,
} from '@nestjs/jwt';

@Injectable()
export class JwtServiceCompat {
  constructor(private readonly jwtService: NestJwtService) {}

  sign(payload: string | Buffer | object, options?: JwtSignOptions): string {
    if (typeof payload === 'string') {
      return this.jwtService.sign(payload, options);
    }

    if (Buffer.isBuffer(payload)) {
      return this.jwtService.sign(payload, options);
    }

    // object
    return this.jwtService.sign(payload, options);
  }

  async signAsync(
    payload: string | Buffer | object,
    options?: JwtSignOptions,
  ): Promise<string> {
    if (typeof payload === 'string') {
      return this.jwtService.signAsync(payload, options);
    }

    if (Buffer.isBuffer(payload)) {
      return this.jwtService.signAsync(payload, options);
    }

    return this.jwtService.signAsync(payload, options);
  }

  verify<T extends object = any>(token: string, options?: JwtVerifyOptions): T {
    return this.jwtService.verify<T>(token, options);
  }

  async verifyAsync<T extends object = any>(
    token: string,
    options?: JwtVerifyOptions,
  ): Promise<T> {
    return this.jwtService.verifyAsync<T>(token, options);
  }

  decode<T = any>(token: string, options?: Record<string, unknown>): T {
    return this.jwtService.decode<T>(token, options);
  }
}
