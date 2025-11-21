import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

@Injectable()
export class CekResiService {
  private readonly logger = new Logger(CekResiService.name);

  constructor(private readonly config: ConfigService) {}

  async track(trackingNumber: string): Promise<unknown> {
    const sanitizedTracking = trackingNumber?.trim();
    if (!sanitizedTracking) {
      throw new NotFoundException('Nomor resi wajib diisi.');
    }

    const baseUrl = this.config.get<string>('CEK_RESI_URL')?.trim();
    if (!baseUrl) {
      throw new ServiceUnavailableException(
        'CEK_RESI_URL belum dikonfigurasi. Tracking tidak tersedia.',
      );
    }

    const url = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(
      sanitizedTracking,
    )}`;

    try {
      const response = await axios.get(url, { timeout: 10000 });
      return response.data as unknown;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data as
        | Record<string, unknown>
        | undefined;

      this.logger.error(
        `CekResi request failed for ${sanitizedTracking} with status ${status ?? 'unknown'}`,
        axiosError.message,
      );

      if (status === 404) {
        throw new NotFoundException('Nomor resi tidak ditemukan.');
      }

      const message =
        typeof data?.message === 'string'
          ? data.message
          : 'Tracking saat ini tidak dapat diakses.';

      throw new BadGatewayException(message);
    }
  }
}
