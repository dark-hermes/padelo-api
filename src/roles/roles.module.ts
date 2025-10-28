import { Module } from '@nestjs/common';
import { CaslModule } from '../casl/casl.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [PrismaModule, CaslModule],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
