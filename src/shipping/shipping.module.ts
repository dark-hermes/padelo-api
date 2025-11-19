import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CaslModule } from 'src/casl/casl.module';
import { KomerceShippingService } from './komerce-shipping.service';
import { ShippingController } from './shipping.controller';

@Module({
  imports: [ConfigModule, CaslModule],
  controllers: [ShippingController],
  providers: [KomerceShippingService],
  exports: [KomerceShippingService],
})
export class ShippingModule {}
