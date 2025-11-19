import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface ShippingOption {
  courier: string;
  service: string;
  description?: string;
  etd?: string;
  cost: number;
}

interface RajaOngkirCityResponse {
  rajaongkir?: {
    results?: Array<{ city_name: string; city_id: string }>;
  };
}

interface RajaOngkirCostResponse {
  rajaongkir?: {
    results?: Array<{
      costs?: Array<{
        service: string;
        description: string;
        cost: Array<{ etd?: string; value: number }>;
      }>;
    }>;
  };
}

@Injectable()
export class RajaOngkirService {
  private readonly logger = new Logger(RajaOngkirService.name);
  private readonly http: AxiosInstance;
  private cityCache: Map<string, number> | null = null;

  constructor(private readonly config: ConfigService) {
    this.http = axios.create();
  }

  private normalizeCityName(name: string): string {
    return name.trim().toLowerCase();
  }

  private async loadCityCache(): Promise<void> {
    if (this.cityCache) return;
    const apiKey = this.config.get<string>('RAJAONGKIR_API_KEY');
    if (!apiKey) {
      this.cityCache = new Map();
      return;
    }

    try {
      const url =
        this.config.get<string>('RAJAONGKIR_BASE_URL')?.trim() ||
        'https://api.rajaongkir.com/starter';
      const response = await this.http.get<RajaOngkirCityResponse>(
        `${url}/city`,
        {
          headers: { key: apiKey },
        },
      );
      const results = response.data.rajaongkir?.results ?? [];
      this.cityCache = new Map(
        results.map((city) => [
          this.normalizeCityName(city.city_name),
          Number(city.city_id),
        ]),
      );
    } catch (error: unknown) {
      this.logger.warn(
        'Failed to fetch RajaOngkir city list, falling back to mock data',
        error instanceof Error ? error.message : this.stringifyError(error),
      );
      this.cityCache = new Map();
    }
  }

  private async getCityId(cityName: string): Promise<number | null> {
    await this.loadCityCache();
    if (!this.cityCache) return null;
    return this.cityCache.get(this.normalizeCityName(cityName)) ?? null;
  }

  private buildFallbackOptions(params: {
    courier: string;
    service?: string;
    weight: number;
  }): ShippingOption[] {
    const kg = params.weight / 1000;
    const base = Math.max(10000, Math.ceil(kg) * 8000);
    return [
      {
        courier: params.courier.toUpperCase(),
        service: params.service?.toUpperCase() ?? 'REG',
        description: 'Fallback cost (RajaOngkir API key not configured)',
        etd: '3-5',
        cost: base,
      },
    ];
  }

  async calculateCost(params: {
    originCity: string;
    destinationCity: string;
    courier: string;
    weight: number; // grams
    service?: string;
  }): Promise<ShippingOption[]> {
    const apiKey = this.config.get<string>('RAJAONGKIR_API_KEY');
    if (!apiKey) {
      return this.buildFallbackOptions(params);
    }

    const originId = await this.getCityId(params.originCity);
    const destinationId = await this.getCityId(params.destinationCity);

    if (!originId || !destinationId) {
      this.logger.warn(
        'Unable to resolve city IDs, using fallback shipping cost',
      );
      return this.buildFallbackOptions(params);
    }

    try {
      const url =
        this.config.get<string>('RAJAONGKIR_BASE_URL')?.trim() ||
        'https://api.rajaongkir.com/starter';
      const weight = Math.max(1, Math.round(params.weight));
      const response = await this.http.post<RajaOngkirCostResponse>(
        `${url}/cost`,
        {
          origin: originId,
          destination: destinationId,
          weight,
          courier: params.courier,
        },
        {
          headers: {
            key: apiKey,
            'Content-Type': 'application/json',
          },
        },
      );
      const costs =
        response.data.rajaongkir?.results?.[0]?.costs?.slice() ?? [];
      if (!costs.length) {
        return this.buildFallbackOptions(params);
      }

      return costs.map((costEntry) => {
        const firstCost = costEntry.cost?.[0];
        return {
          courier: params.courier.toUpperCase(),
          service: costEntry.service,
          description: costEntry.description,
          etd: firstCost?.etd,
          cost: Number(firstCost?.value ?? 0),
        } satisfies ShippingOption;
      });
    } catch (error: unknown) {
      this.logger.error(
        'Failed to call RajaOngkir cost API',
        error instanceof Error ? error.message : this.stringifyError(error),
      );
      return this.buildFallbackOptions(params);
    }
  }

  private stringifyError(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return '[unknown-error]';
    }
  }
}
