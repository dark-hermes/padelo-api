import { Module } from '@nestjs/common';
import { CaslModule } from 'src/casl/casl.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';

@Module({
  imports: [PrismaModule, CaslModule],
  controllers: [AddressesController],
  providers: [AddressesService],
  exports: [AddressesService],
})
export class AddressesModule {}
