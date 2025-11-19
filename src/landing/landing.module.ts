import { Module } from '@nestjs/common';
import { CaslModule } from 'src/casl/casl.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LandingService } from './landing.service';
import { LandingController } from './landing.controller';

@Module({
  imports: [PrismaModule, CaslModule],
  controllers: [LandingController],
  providers: [LandingService],
  exports: [LandingService],
})
export class LandingModule {}
