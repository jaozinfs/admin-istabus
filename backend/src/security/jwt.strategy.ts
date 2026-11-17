import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { AdminOperator } from '../entities/admin-operator.entity';

type JwtPayload = { sub: string; username: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(AdminOperator)
    private readonly operators: Repository<AdminOperator>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('ADMIN_JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const op = await this.operators.findOne({ where: { id: payload.sub } });
    if (!op) throw new UnauthorizedException();
    return { operatorId: op.id, username: op.username };
  }
}
