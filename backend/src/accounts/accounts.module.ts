import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IbCompany } from '../entities/ib-company.entity';
import { IbUser } from '../entities/ib-user.entity';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [TypeOrmModule.forFeature([IbUser, IbCompany])],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule {}
