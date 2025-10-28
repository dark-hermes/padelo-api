import { Module } from '@nestjs/common';
import { CaslModule } from '../casl/casl.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [PrismaModule, CaslModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
})
export class PermissionsModule {}
