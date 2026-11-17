import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../security/public.decorator';
import { AuthService } from './auth.service';
import { BootstrapDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Get('status')
  status() {
    return this.auth.status();
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('bootstrap')
  bootstrap(@Body() dto: BootstrapDto) {
    return this.auth.bootstrap(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
}
