import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAccessMiddleware } from './security/admin-access.middleware';
import { JwtAuthGuard } from './security/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { UsageModule } from './usage/usage.module';
import { HealthController } from './health.controller';
import { AdminOperator } from './entities/admin-operator.entity';
import { IbUser } from './entities/ib-user.entity';
import { IbCompany } from './entities/ib-company.entity';
import { IbWhatsappAudit } from './entities/ib-whatsapp-audit.entity';
import { IbWhatsappScheduled } from './entities/ib-whatsapp-scheduled.entity';
import { IbPost } from './entities/ib-post.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('ADMIN_JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN') || '12h',
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [
          AdminOperator,
          IbUser,
          IbCompany,
          IbWhatsappAudit,
          IbWhatsappScheduled,
          IbPost,
        ],
        synchronize: false,
        ssl:
          process.env.DATABASE_SSL === 'false'
            ? false
            : { rejectUnauthorized: false },
      }),
    }),
    AuthModule,
    AccountsModule,
    UsageModule,
  ],
  controllers: [HealthController],
  providers: [
    AdminAccessMiddleware,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AdminAccessMiddleware).forRoutes('*');
  }
}
