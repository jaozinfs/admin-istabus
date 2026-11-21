import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UsageService } from './usage.service';

@Controller('usage')
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get('daily')
  daily(
    @Query('date') date?: string,
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.usage.daily({ date, companyId, userId });
  }

  @Get('top-today')
  topToday(@Query('limit') limit?: string) {
    return this.usage.topToday(limit ? Number(limit) : 30);
  }

  @Get('dispatches')
  dispatches(
    @Query('date') date?: string,
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.usage.dispatches({
      date,
      companyId,
      userId,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  /** Pausa/cancela todos os disparos ativos da conta (empresa ou pessoal). */
  @Post('pause-account')
  pauseAccount(
    @Body() body: { userId?: string; companyId?: string | null },
  ) {
    return this.usage.pauseAccount({
      userId: body.userId ?? '',
      companyId: body.companyId,
    });
  }

  @Get('company-report/:companyId')
  companyReport(
    @Param('companyId') companyId: string,
    @Query('month') month?: string,
  ) {
    return this.usage.companyReport(companyId, month);
  }
}
