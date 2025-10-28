import { Injectable } from '@nestjs/common';
import {
  JwtSignOptions,
  JwtVerifyOptions,
  JwtService as NestJwtService,
} from '@nestjs/jwt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtServiceCompat {
  constructor(private readonly jwtService: NestJwtService) {}

  sign(
    payload: string,
    options?: Omit<JwtSignOptions, keyof jwt.SignOptions>,
  ): string;
  sign(payload: Buffer | object, options?: JwtSignOptions): string;
  sign(payload: string | Buffer | object, options?: JwtSignOptions): string {
    if (typeof payload === 'string') {
      return this.jwtService.sign(
        payload,
        options as unknown as Omit<JwtSignOptions, keyof jwt.SignOptions>,
      );
    }

    if (Buffer.isBuffer(payload)) {
      return this.jwtService.sign(payload, options);
    }

    // object
    return this.jwtService.sign(payload, options);
  }

  signAsync(
    payload: string,
    options?: Omit<JwtSignOptions, keyof jwt.SignOptions>,
  ): Promise<string>;
  signAsync(
    payload: Buffer | object,
    options?: JwtSignOptions,
  ): Promise<string>;
  async signAsync(
    payload: string | Buffer | object,
    options?: JwtSignOptions,
  ): Promise<string> {
    if (typeof payload === 'string') {
      return this.jwtService.signAsync(
        payload,
        options as unknown as Omit<JwtSignOptions, keyof jwt.SignOptions>,
      );
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

  decode<T = any>(token: string, options?: jwt.DecodeOptions): T {
    return this.jwtService.decode<T>(token, options);
  }
}
