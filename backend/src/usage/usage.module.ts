import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from '../accounts/accounts.module';
import { IbCompany } from '../entities/ib-company.entity';
import { IbUser } from '../entities/ib-user.entity';
import { IbWhatsappAudit } from '../entities/ib-whatsapp-audit.entity';
import { IbWhatsappScheduled } from '../entities/ib-whatsapp-scheduled.entity';
import { IbPost } from '../entities/ib-post.entity';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IbWhatsappAudit,
      IbWhatsappScheduled,
      IbPost,
      IbUser,
      IbCompany,
    ]),
    AccountsModule,
  ],
  controllers: [UsageController],
  providers: [UsageService],
})
export class UsageModule {}
