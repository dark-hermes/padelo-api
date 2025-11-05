import { Module } from '@nestjs/common';
import { CaslModule } from '../casl/casl.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [PrismaModule, CaslModule],
  providers: [TeamsService],
  controllers: [TeamsController],
})
export class TeamsModule {}
