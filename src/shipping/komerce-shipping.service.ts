import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { CalculateTariffDto } from './dto/calculate-tariff.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { DestinationSearchDto } from './dto/destination-search.dto';
import { HistoryAwbDto } from './dto/history-awb.dto';
import { PickupRequestDto } from './dto/pickup-request.dto';
import { PrintLabelDto } from './dto/print-label.dto';
import { StoreOrderDto } from './dto/store-order.dto';
import { KomerceWebhookDto } from './dto/webhook.dto';

interface KomerceResponse<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class KomerceShippingService {
  private readonly logger = new Logger(KomerceShippingService.name);
  private readonly tariffHttp: AxiosInstance;
  private readonly orderHttp: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.tariffHttp = axios.create({
      baseURL:
        this.config.get<string>('KOMERCE_TARIFF_BASE_URL')?.trim() ||
        'https://api-sandbox.collaborator.komerce.id/tariff/api/v1',
      timeout: 10000,
    });

    this.orderHttp = axios.create({
      baseURL:
        this.config.get<string>('KOMERCE_ORDER_BASE_URL')?.trim() ||
        'https://api-sandbox.collaborator.komerce.id/order/api/v1',
      timeout: 15000,
    });
  }

  async searchDestination(dto: DestinationSearchDto) {
    const response = await this.request<KomerceResponse>(this.tariffHttp, {
      method: 'GET',
      url: '/destination/search',
      params: { keyword: dto.keyword },
    });
    return response.data;
  }

  async calculateTariff(dto: CalculateTariffDto) {
    const response = await this.request<KomerceResponse>(this.tariffHttp, {
      method: 'GET',
      url: '/calculate',
      params: {
        shipper_destination_id: dto.shipperDestinationId,
        receiver_destination_id: dto.receiverDestinationId,
        weight: dto.weight,
        item_value: dto.itemValue,
        cod: dto.cod ? 'yes' : 'no',
        origin_pin_point: dto.originPinPoint,
        destination_pin_point: dto.destinationPinPoint,
      },
    });
    return response.data;
  }

  async storeOrder(dto: StoreOrderDto) {
    const response = await this.request<KomerceResponse>(this.orderHttp, {
      method: 'POST',
      url: '/orders/store',
      data: dto,
    });
    return response.data;
  }

  async cancelOrder(dto: CancelOrderDto) {
    const response = await this.request<KomerceResponse>(this.orderHttp, {
      method: 'PUT',
      url: '/orders/cancel',
      data: { order_no: dto.orderNo },
    });
    return response.data;
  }

  async getOrderDetail(orderNo: string) {
    const response = await this.request<KomerceResponse>(this.orderHttp, {
      method: 'GET',
      url: '/orders/detail',
      params: { order_no: orderNo },
    });
    return response.data;
  }

  async getOrderHistory(dto: HistoryAwbDto) {
    const response = await this.request<KomerceResponse>(this.orderHttp, {
      method: 'GET',
      url: '/orders/history-airway-bill',
      params: {
        shipping: dto.shipping,
        airway_bill: dto.airwayBill,
      },
    });
    return response.data;
  }

  async requestPickup(dto: PickupRequestDto) {
    const response = await this.request<KomerceResponse>(this.orderHttp, {
      method: 'POST',
      url: '/pickup/request',
      data: dto,
    });
    return response.data;
  }

  async printLabel(dto: PrintLabelDto) {
    const response = await this.request<KomerceResponse>(this.orderHttp, {
      method: 'POST',
      url: '/orders/print-label',
      params: {
        page: dto.page,
        order_no: dto.orderNos.join(','),
      },
    });
    return response.data;
  }

  handleWebhook(dto: KomerceWebhookDto) {
    this.logger.log(
      `Received Komerce webhook for order ${dto.order_no} with status ${dto.status}`,
    );
    return { received: true };
  }

  private async request<T = unknown>(
    client: AxiosInstance,
    config: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const headers = {
        ...config.headers,
        ...this.buildAuthHeader(),
      };
      const response = await client.request<T>({ ...config, headers });
      return response.data;
    } catch (error: unknown) {
      throw this.normalizeError(error);
    }
  }

  private buildAuthHeader() {
    const apiKey = this.config.get<string>('KOMERCE_API_KEY');
    if (!apiKey) {
      throw new Error('KOMERCE_API_KEY is not configured.');
    }
    return { 'x-api-key': apiKey };
  }

  private normalizeError(error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message || axiosError.message || 'UNKNOWN';
      this.logger.error('Komerce API error', message);
      return new Error(`Komerce API error: ${message}`);
    }
    this.logger.error(
      'Unhandled Komerce API error',
      this.stringifyError(error),
    );
    return new Error('Unhandled Komerce API error');
  }

  private stringifyError(value: unknown) {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return '[unknown-error]';
    }
  }
}
