import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CaslModule } from 'src/casl/casl.module';
import { CekResiService } from './cek-resi.service';
import { KomerceShippingService } from './komerce-shipping.service';
import { ShippingController } from './shipping.controller';

@Module({
  imports: [ConfigModule, CaslModule],
  controllers: [ShippingController],
  providers: [KomerceShippingService, CekResiService],
  exports: [KomerceShippingService, CekResiService],
})
export class ShippingModule {}
