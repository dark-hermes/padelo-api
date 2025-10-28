import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CheckAbilities } from 'src/casl/abilities.decorator';
import { AbilitiesGuard } from 'src/casl/abilities.guard';
import { Action } from 'src/casl/casl-ability.factory';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('all')
  async getAll() {
    return this.settingsService.getAll();
  }

  @Patch(':key')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  async update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    const updated = await this.settingsService.update(key, dto.value);
    return updated;
  }
}
