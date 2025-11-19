import { Module } from '@nestjs/common';
import { ProductsModule } from 'src/products/products.module';
import { TeamsModule } from 'src/teams/teams.module';
import { PublicController } from './public.controller';

@Module({
  imports: [TeamsModule, ProductsModule],
  controllers: [PublicController],
})
export class PublicModule {}
