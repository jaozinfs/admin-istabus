import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { IbCompany } from '../entities/ib-company.entity';
import { IbUser } from '../entities/ib-user.entity';
import { IbUserLoginAudit } from '../entities/ib-user-login-audit.entity';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { IpGeoService } from './ip-geo.service';
import { StripeMetaService } from './stripe-meta.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([IbUser, IbCompany, IbUserLoginAudit]),
    AuthModule,
  ],
  controllers: [AccountsController],
  providers: [AccountsService, StripeMetaService, IpGeoService],
  exports: [AccountsService, StripeMetaService],
})
export class AccountsModule {}
