/* eslint-disable */
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { KomerceShippingService } from '../komerce-shipping.service';

jest.mock('axios');

describe('KomerceShippingService (unit)', () => {
  interface AxiosMock {
    request: jest.Mock;
  }
  const createAxiosMock = (responseData: unknown): AxiosMock => {
    return {
      request: jest.fn().mockResolvedValue({ data: responseData }),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const configWithKey: Partial<ConfigService> = {
    get: (key: string) => (key === 'KOMERCE_API_KEY' ? 'test-key' : undefined),
  };

  it('calculateTariff returns nested data payload', async () => {
    const tariffInstance = createAxiosMock({
      success: true,
      data: { calculate_reguler: [{ shipping_cost_net: 14000 }] },
    });
    const orderInstance = createAxiosMock({ success: true });
    (axios.create as jest.Mock)
      .mockReturnValueOnce(tariffInstance)
      .mockReturnValueOnce(orderInstance);
    const service = new KomerceShippingService(configWithKey as ConfigService);
    const result = await service.calculateTariff({
      shipperDestinationId: 1,
      receiverDestinationId: 2,
      weight: 1,
      itemValue: 1000,
      cod: true,
    });
    expect(result).toEqual({
      calculate_reguler: [{ shipping_cost_net: 14000 }],
    });
    expect(tariffInstance.request).toHaveBeenCalledTimes(1);
    const calledConfig = tariffInstance.request.mock.calls[0][0];
    expect(calledConfig.params.cod).toBe('yes');
  });

  it('falls back to generic error when API key missing', async () => {
    const tariffInstance = createAxiosMock({ success: true, data: {} });
    const orderInstance = createAxiosMock({ success: true });
    (axios.create as jest.Mock)
      .mockReturnValueOnce(tariffInstance)
      .mockReturnValueOnce(orderInstance);
    const configWithoutKey: Partial<ConfigService> = { get: () => undefined };
    const service = new KomerceShippingService(
      configWithoutKey as ConfigService,
    );
    await expect(
      service.calculateTariff({
        shipperDestinationId: 1,
        receiverDestinationId: 2,
        weight: 1,
        itemValue: 1000,
        cod: false,
      }),
    ).rejects.toThrow('Unhandled Komerce API error');
  });

  it('normalizes axios plain error message', async () => {
    const error = new Error('Network down');
    const tariffInstance: AxiosMock = {
      request: jest.fn().mockRejectedValue(error),
    };
    const orderInstance: AxiosMock = { request: jest.fn() };
    (axios.create as jest.Mock)
      .mockReturnValueOnce(tariffInstance)
      .mockReturnValueOnce(orderInstance);
    const service = new KomerceShippingService(configWithKey as ConfigService);
    await expect(
      service.calculateTariff({
        shipperDestinationId: 1,
        receiverDestinationId: 2,
        weight: 1,
        itemValue: 1000,
        cod: true,
      }),
    ).rejects.toThrow(/Komerce API error/);
  });

  it('storeOrder success returns flattened data', async () => {
    const tariffInstance = createAxiosMock({ success: true });
    const orderInstance = createAxiosMock({
      success: true,
      data: { order_no: 'ABC123' },
    });
    (axios.create as jest.Mock)
      .mockReturnValueOnce(tariffInstance)
      .mockReturnValueOnce(orderInstance);
    const service = new KomerceShippingService(configWithKey as ConfigService);
    const dto = {
      orderDate: '2025-01-01',
      brandName: 'Brand',
      shipperName: 'Sender',
      shipperPhone: '0800000',
      shipperDestinationId: 1,
      shipperAddress: 'Addr',
      shipperEmail: 'sender@example.com',
      receiverName: 'Receiver',
      receiverPhone: '081111',
      receiverDestinationId: 2,
      receiverAddress: 'Recv Addr',
      shipping: 'JNE',
      shippingType: 'REG',
      paymentMethod: 'BANK TRANSFER',
      shippingCost: 10000,
      shippingCashback: 0,
      serviceFee: 0,
      additionalCost: 0,
      grandTotal: 10000,
      codValue: 0,
      insuranceValue: 0,
      orderDetails: [
        {
          productName: 'Item',
          productVariantName: 'Var',
          productPrice: 5000,
          productWeight: 200,
          productWidth: 10,
          productHeight: 5,
          productLength: 10,
          qty: 1,
          subtotal: 5000,
        },
      ],
    };
    const result = await service.storeOrder(dto as any);
    expect(result).toEqual({ order_no: 'ABC123' });
    expect(orderInstance.request).toHaveBeenCalledTimes(1);
    const calledConfig = orderInstance.request.mock.calls[0][0];
    expect(calledConfig.url).toBe('/orders/store');
  });

  it('cancelOrder propagates axios response error message', async () => {
    const tariffInstance = createAxiosMock({ success: true });
    const orderInstance: AxiosMock = {
      request: jest.fn().mockRejectedValue({
        isAxiosError: true,
        response: { data: { message: 'Order not found' } },
        message: 'Request failed',
      }),
    };
    (axios.create as jest.Mock)
      .mockReturnValueOnce(tariffInstance)
      .mockReturnValueOnce(orderInstance);
    (axios.isAxiosError as any) = jest
      .fn()
      .mockImplementation((e: any) => !!e.isAxiosError);
    const service = new KomerceShippingService(configWithKey as ConfigService);
    await expect(
      service.cancelOrder({ orderNo: 'XYZ999' } as any),
    ).rejects.toThrow('Komerce API error: Order not found');
  });
});
