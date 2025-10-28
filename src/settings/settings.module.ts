import { Module } from '@nestjs/common';
import { CaslModule } from 'src/casl/casl.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [PrismaModule, CaslModule],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
