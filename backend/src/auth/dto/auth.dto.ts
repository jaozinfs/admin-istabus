import { IsString, MinLength } from 'class-validator';

export class BootstrapDto {
  @IsString()
  @MinLength(16)
  bootstrapSecret: string;
}

export class LoginDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}
