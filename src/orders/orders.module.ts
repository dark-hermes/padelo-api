import { Module } from '@nestjs/common';
import { CaslModule } from 'src/casl/casl.module';
import { ShippingModule } from 'src/shipping/shipping.module';
import { MidtransService } from './midtrans.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [CaslModule, ShippingModule],
  controllers: [OrdersController],
  providers: [OrdersService, MidtransService],
})
export class OrdersModule {}
