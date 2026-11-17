import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AccountsService } from './accounts.service';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly auth: AuthService,
  ) {}

  @Get('stats')
  stats() {
    return this.accounts.stats();
  }

  @Get('products')
  products() {
    return this.accounts.distinctProducts();
  }

  @Get()
  list(@Query('q') q?: string) {
    return this.accounts.overview(q);
  }

  @Get('companies')
  companies(@Query('q') q?: string) {
    return this.accounts.listCompanies(q);
  }

  @Get('companies/:id')
  company(@Param('id') id: string) {
    return this.accounts.companyDetail(id);
  }

  @Get('users/:id')
  user(@Param('id') id: string) {
    return this.accounts.userDetail(id);
  }

  @Patch('plan')
  async updatePlan(
    @Body() dto: UpdatePlanDto,
    @Req() req: { user?: { operatorId?: string } },
  ) {
    const operatorId = req.user?.operatorId;
    if (!operatorId) throw new UnauthorizedException();
    await this.auth.assertOperatorPassword(operatorId, dto.confirmPassword);
    return this.accounts.updatePlan(dto);
  }
}
