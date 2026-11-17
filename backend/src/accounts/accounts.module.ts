import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { IbCompany } from '../entities/ib-company.entity';
import { IbUser } from '../entities/ib-user.entity';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { StripeMetaService } from './stripe-meta.service';

@Module({
  imports: [TypeOrmModule.forFeature([IbUser, IbCompany]), AuthModule],
  controllers: [AccountsController],
  providers: [AccountsService, StripeMetaService],
  exports: [AccountsService, StripeMetaService],
})
export class AccountsModule {}
