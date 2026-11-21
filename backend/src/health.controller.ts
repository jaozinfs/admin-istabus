import { Controller, Get } from '@nestjs/common';

/** Health autenticado — exige X-Admin-Secret + Bearer JWT (guards globais). */
@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { ok: true, service: 'admin-istabus' };
  }
}
