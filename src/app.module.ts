import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
// Note: `JwtServiceCompat` exists for explicit imports elsewhere. We don't
// register it globally to avoid DI cycles.
// JwtServiceCompat intentionally not used in this file to avoid global provider
// override (see auth module). Keep the file available for explicit imports.
import { AddressesModule } from './addresses/addresses.module';
import './auth/jwt-service.compat';
import { CartModule } from './cart/cart.module';
import { BaseUrlMiddleware } from './common/middleware/base-url.middleware';
import { MaintenanceMiddleware } from './common/middleware/maintenance.middleware';
import { OrdersModule } from './orders/orders.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductsModule } from './products/products.module';
import { ProfileModule } from './profile/profile.module';
import { RolesModule } from './roles/roles.module';
import { SettingsModule } from './settings/settings.module';
import { ShippingModule } from './shipping/shipping.module';
import { TeamsModule } from './teams/teams.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({}),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
          },
        },
      },
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ProfileModule,
    SettingsModule,
    TeamsModule,
    ProductsModule,
    AddressesModule,
    CartModule,
    OrdersModule,
    ShippingModule,
  ],
  providers: [
    // JwtService provider left as provided by JwtModule. We keep the compat
    // wrapper file available but avoid overriding the JwtService token here to
    // prevent circular dependency at runtime.
  ],
  controllers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MaintenanceMiddleware).forRoutes('*');
    consumer.apply(BaseUrlMiddleware).forRoutes('*');
  }
}
