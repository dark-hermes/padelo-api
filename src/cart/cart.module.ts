import { Module } from '@nestjs/common';
import { CaslModule } from 'src/casl/casl.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [CaslModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
