import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface MidtransTransactionResult {
  token: string;
  redirect_url: string;
}

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.http = axios.create();
  }

  async createTransaction(payload: {
    orderId: string;
    grossAmount: number;
    customer: { name: string; email?: string; phone?: string };
    items: Array<{ id: string; price: number; quantity: number; name: string }>;
  }): Promise<MidtransTransactionResult> {
    const serverKey = this.config.get<string>('MIDTRANS_SERVER_KEY')?.trim();
    if (!serverKey) {
      this.logger.warn(
        'MIDTRANS_SERVER_KEY not configured, returning mock token',
      );
      return {
        token: `mock-token-${payload.orderId}`,
        redirect_url: `https://midtrans.mock/redirect/${payload.orderId}`,
      };
    }

    const url = this.resolveSnapUrl(serverKey);

    const requestBody = {
      transaction_details: {
        order_id: payload.orderId,
        gross_amount: payload.grossAmount,
      },
      item_details: payload.items.map((item) => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        name: item.name.slice(0, 50),
      })),
      customer_details: {
        first_name: payload.customer.name,
        email: payload.customer.email,
        phone: payload.customer.phone,
      },
    };

    try {
      const auth = Buffer.from(`${serverKey}:`).toString('base64');
      const response = await this.http.post<MidtransTransactionResult>(
        url,
        requestBody,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error: unknown) {
      const normalizedError =
        error instanceof Error ? error : new Error(this.safeStringify(error));
      this.logger.error(
        'Failed to create Midtrans transaction',
        normalizedError.message,
      );
      throw normalizedError;
    }
  }

  private resolveSnapUrl(serverKey: string): string {
    const configuredUrl = this.config.get<string>('MIDTRANS_SNAP_URL')?.trim();
    const derivedUrl = this.isSandboxServerKey(serverKey)
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
      : 'https://app.midtrans.com/snap/v1/transactions';

    if (!configuredUrl) {
      return derivedUrl;
    }

    const configuredEnv = this.isSandboxUrl(configuredUrl)
      ? 'sandbox'
      : 'production';
    const keyEnv = this.isSandboxServerKey(serverKey)
      ? 'sandbox'
      : 'production';

    if (configuredEnv !== keyEnv) {
      this.logger.warn(
        `MIDTRANS_SNAP_URL points to ${configuredEnv} but server key indicates ${keyEnv}. defaulting to ${keyEnv} endpoint to prevent 401 errors.`,
      );
      return derivedUrl;
    }

    return configuredUrl;
  }

  private isSandboxServerKey(serverKey: string): boolean {
    return serverKey.trim().startsWith('SB-');
  }

  private isSandboxUrl(url: string): boolean {
    return /\.sandbox\./i.test(url);
  }

  private safeStringify(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch {
      if (value && typeof value === 'object') {
        const ctorName = (value as { constructor?: { name?: string } })
          .constructor?.name;
        return `[unknown-error:${ctorName ?? 'Object'}]`;
      }
      return `[unknown-error:${typeof value}]`;
    }
  }
}
