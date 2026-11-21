import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../security/public.decorator';
import { AuthService } from './auth.service';
import { BootstrapDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Sessão atual — requer JWT + secret.
   * Use no front para validar que o token ainda é de um operador válido.
   */
  @Get('me')
  me(@Req() req: { user?: { operatorId?: string; username?: string } }) {
    return this.auth.me(req.user?.operatorId);
  }

  /** Status de bootstrap — requer JWT (só operador logado vê). */
  @Get('status')
  status() {
    return this.auth.status();
  }

  /** Única rota pública além do login: cria o 1º operador (secret + bootstrap secret). */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('bootstrap')
  bootstrap(@Body() dto: BootstrapDto) {
    return this.auth.bootstrap(dto);
  }

  /** Login do operador — público só com X-Admin-Secret (middleware). */
  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
}
