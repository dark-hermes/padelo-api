import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CekResiService } from '../cek-resi.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CekResiService', () => {
  let service: CekResiService;
  let config: ConfigService;

  beforeEach(() => {
    mockedAxios.get.mockReset();
    const getMock = jest.fn();
    config = { get: getMock } as unknown as ConfigService;
    service = new CekResiService(config);
  });

  it('throws when CEK_RESI_URL is not configured', async () => {
    (config.get as jest.Mock).mockReturnValue(undefined);

    await expect(service.track('ABC')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('calls remote API with sanitized tracking number', async () => {
    (config.get as jest.Mock).mockReturnValue(
      'http://localhost:8001/cek-resi/',
    );
    mockedAxios.get.mockResolvedValue({ data: { status: 200 } });

    const result = await service.track(' 123456 ');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const getCalled = mockedAxios.get as jest.Mock;

    expect(getCalled).toHaveBeenCalledWith(
      'http://localhost:8001/cek-resi/123456',
      expect.any(Object),
    );
    expect(result).toEqual({ status: 200 });
  });
});
