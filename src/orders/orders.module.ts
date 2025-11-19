import { Module } from '@nestjs/common';
import { CaslModule } from 'src/casl/casl.module';
import { MidtransService } from './midtrans.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { RajaOngkirService } from './rajaongkir.service';

@Module({
  imports: [CaslModule],
  controllers: [OrdersController],
  providers: [OrdersService, RajaOngkirService, MidtransService],
})
export class OrdersModule {}
