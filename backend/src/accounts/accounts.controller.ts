import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

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
  updatePlan(@Body() dto: UpdatePlanDto) {
    return this.accounts.updatePlan(dto);
  }
}
