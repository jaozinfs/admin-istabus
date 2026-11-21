import {
  ConflictException,
  ForbiddenException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { AdminOperator } from '../entities/admin-operator.entity';
import { BootstrapDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(AdminOperator)
    private readonly operators: Repository<AdminOperator>,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS admin_operators (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username varchar(64) NOT NULL UNIQUE,
        password_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        last_login_at timestamptz NULL
      );
    `);
  }

  async status() {
    const count = await this.operators.count();
    return {
      bootstrapped: count > 0,
      operators: count,
    };
  }

  async me(operatorId?: string) {
    if (!operatorId) throw new UnauthorizedException('Sessão inválida');
    const op = await this.operators.findOne({ where: { id: operatorId } });
    if (!op) throw new UnauthorizedException('Operador inválido');
    return {
      operatorId: op.id,
      username: op.username,
      lastLoginAt: op.lastLoginAt,
      bootstrapped: true,
      operators: await this.operators.count(),
    };
  }

  async bootstrap(dto: BootstrapDto) {
    const expected = this.config.get<string>('ADMIN_BOOTSTRAP_SECRET')?.trim();
    if (!expected || dto.bootstrapSecret !== expected) {
      throw new ForbiddenException('Bootstrap secret inválido');
    }
    const count = await this.operators.count();
    if (count > 0) {
      throw new ConflictException('Operador já criado. Bootstrap bloqueado.');
    }
    const username = `admin_${randomBytes(3).toString('hex')}`;
    const password = randomBytes(18).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 14);
    const op = this.operators.create({
      username,
      passwordHash,
      lastLoginAt: null,
    });
    await this.operators.save(op);
    return {
      username,
      password,
      note: 'Guarde agora. A senha não será exibida de novo (só hash no banco).',
    };
  }

  async login(dto: LoginDto) {
    const op = await this.operators.findOne({
      where: { username: dto.username },
    });
    if (!op) throw new UnauthorizedException('Credenciais inválidas');
    const ok = await bcrypt.compare(dto.password, op.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');
    op.lastLoginAt = new Date();
    await this.operators.save(op);
    const accessToken = await this.jwt.signAsync({
      sub: op.id,
      username: op.username,
    });
    return {
      accessToken,
      username: op.username,
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') || '12h',
    };
  }

  async assertOperatorPassword(operatorId: string, password: string) {
    const op = await this.operators.findOne({ where: { id: operatorId } });
    if (!op) throw new UnauthorizedException('Operador inválido');
    const ok = await bcrypt.compare(password, op.passwordHash);
    if (!ok) throw new UnauthorizedException('Senha do admin incorreta');
    return op;
  }
}
