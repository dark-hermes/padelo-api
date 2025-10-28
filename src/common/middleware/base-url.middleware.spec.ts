import { BaseUrlMiddleware } from './base-url.middleware';

describe('BaseUrlMiddleware', () => {
  it('should be defined', () => {
    expect(new BaseUrlMiddleware()).toBeDefined();
  });
});
