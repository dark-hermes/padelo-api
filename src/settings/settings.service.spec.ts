import { PrismaService } from 'src/prisma/prisma.service';
import { SettingsService } from './settings.service';

const mockSettings = [
  { id: '1', key: 'siteTitle', value: 'Padelo', label: 'Site Title' },
  { id: '2', key: 'maintenanceMode', value: 'false', label: 'Maintenance' },
  { id: '3', key: 'autoLogoutTime', value: '30', label: 'Auto Logout' },
];

describe('SettingsService', () => {
  let service: SettingsService;

  const mockPrisma = {
    setting: {
      findMany: jest.fn().mockImplementation(() => mockSettings),
      findUnique: jest
        .fn()
        .mockImplementation(({ where: { key } }: { where: { key: string } }) =>
          mockSettings.find((s) => s.key === key),
        ),
      update: jest
        .fn()
        .mockImplementation(
          ({
            where: { key },
            data: { value },
          }: {
            where: { key: string };
            data: { value: string };
          }) => ({
            key,
            value,
          }),
        ),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SettingsService(mockPrisma);
  });

  it('should fetch settings from database on each call', async () => {
    const first = await service.getAll();
    expect(first.siteTitle).toBe('Padelo');
    expect(first.maintenanceMode).toBe(false);
    expect(first.autoLogoutTime).toBe(30);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const findManyMock = mockPrisma.setting.findMany as jest.Mock;
    expect(findManyMock).toHaveBeenCalledTimes(1);

    // Second call should also hit database (no cache)
    findManyMock.mockClear();
    const second = await service.getAll();
    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(second.siteTitle).toBe('Padelo');
  });

  it('should update setting in database', async () => {
    const updated = await service.update('siteTitle', 'New Title');
    expect(updated.key).toBe('siteTitle');
    expect(updated.value).toBe('New Title');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const updateMock = mockPrisma.setting.update as jest.Mock;
    expect(updateMock).toHaveBeenCalledWith({
      where: { key: 'siteTitle' },
      data: { value: 'New Title' },
    });
  });
});
