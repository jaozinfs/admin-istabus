import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IbMetaQuotaPurchase } from '../entities/ib-meta-quota-purchase.entity';
import { IbUser } from '../entities/ib-user.entity';
import { IbUserLoginAudit } from '../entities/ib-user-login-audit.entity';
import { IbWhatsappScheduled } from '../entities/ib-whatsapp-scheduled.entity';
import { OpsController } from './ops.controller';
import { OpsService } from './ops.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IbWhatsappScheduled,
      IbMetaQuotaPurchase,
      IbUserLoginAudit,
      IbUser,
    ]),
  ],
  controllers: [OpsController],
  providers: [OpsService],
})
export class OpsModule {}
