import { Controller, Get } from '@nestjs/common';
import { Public } from './security/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  health() {
    return { ok: true, service: 'admin-istabus' };
  }
}
