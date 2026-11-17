import { Controller, Get, Query } from '@nestjs/common';
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
}
