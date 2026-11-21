import { Controller, Get, Query } from '@nestjs/common';
import { OpsService } from './ops.service';

@Controller('ops')
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Get('broadcasts')
  broadcasts(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('date') date?: string,
  ) {
    return this.ops.listBroadcasts({
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      from,
      to,
      date,
    });
  }

  @Get('purchases')
  purchases(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ) {
    return this.ops.listPurchases({
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      date,
    });
  }

  @Get('logins')
  logins(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('success') success?: string,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.ops.listLogins({
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      success,
      date,
      from,
      to,
    });
  }
}
