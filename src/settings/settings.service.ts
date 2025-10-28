import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

interface RawSetting {
  id: string;
  key: string;
  value: string;
  label?: string | null;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private prisma: PrismaService) {}

  private parseValue(key: string, raw: string) {
    if (key === 'maintenanceMode') return raw === 'true';
    if (key === 'autoLogoutTime') return Number(raw);
    return raw;
  }

  async getAll() {
    this.logger.debug('Fetching all settings from DB');
    const rows = await this.prisma.setting.findMany();
    const result: Record<string, any> = {};
    for (const r of rows as RawSetting[]) {
      result[r.key] = this.parseValue(r.key, r.value);
    }
    return result;
  }

  async update(key: string, value: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    const updated = await this.prisma.setting.update({
      where: { key },
      data: { value },
    });

    return {
      key: updated.key,
      value: this.parseValue(updated.key, updated.value),
    };
  }
}
