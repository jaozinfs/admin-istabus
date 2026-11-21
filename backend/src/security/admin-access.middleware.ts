import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';

/**
 * Gate 1 — nenhuma rota da API responde sem ADMIN_ACCESS_SECRET.
 * (Nem health. Nem auth. Nem OPTIONS de browser sem o header nas requests reais.)
 */
@Injectable()
export class AdminAccessMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    // Preflight CORS não carrega X-Admin-Secret; o browser só valida headers.
    if (req.method === 'OPTIONS') {
      return next();
    }

    const expected = this.config.get<string>('ADMIN_ACCESS_SECRET')?.trim();
    if (!expected) {
      throw new UnauthorizedException('ADMIN_ACCESS_SECRET não configurado');
    }
    const provided = String(req.header('x-admin-secret') || '');
    if (!safeEqual(provided, expected)) {
      throw new UnauthorizedException('Acesso negado');
    }
    next();
  }
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  try {
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
