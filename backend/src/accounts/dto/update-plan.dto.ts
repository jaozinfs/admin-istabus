import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdatePlanDto {
  @IsIn(['user', 'company'])
  scope: 'user' | 'company';

  @IsUUID()
  id: string;

  @IsOptional()
  @IsString()
  stripeProductId?: string | null;

  @IsOptional()
  @IsString()
  stripePriceId?: string | null;

  @IsOptional()
  @IsString()
  stripeSubscriptionId?: string | null;

  @IsOptional()
  @IsString()
  stripeSubscriptionStatus?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quotaWhatsappBroadcastMetaLimit?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quotaWhatsappBroadcastBaileysLimit?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quotaWhatsappGroupBaileysLimit?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quotaFeedLimit?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quotaStoryLimit?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quotaGeniaLimit?: number | null;
}
