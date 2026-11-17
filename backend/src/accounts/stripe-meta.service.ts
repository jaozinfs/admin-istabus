import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class StripeMetaService {
  private readonly logger = new Logger(StripeMetaService.name);
  private readonly cache = new Map<
    string,
    { at: number; meta: Record<string, string> }
  >();

  async getProductMetadata(
    productId: string | null | undefined,
  ): Promise<Record<string, string> | null> {
    const pid = productId?.trim();
    if (!pid) return null;
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) return null;

    const cached = this.cache.get(pid);
    if (cached && Date.now() - cached.at < 60_000) return cached.meta;

    try {
      const res = await fetch(`https://api.stripe.com/v1/products/${pid}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        this.logger.warn(`Stripe product ${pid} → HTTP ${res.status}`);
        return null;
      }
      const data = (await res.json()) as {
        metadata?: Record<string, string>;
      };
      const meta = data.metadata ?? {};
      this.cache.set(pid, { at: Date.now(), meta });
      return meta;
    } catch (e) {
      this.logger.warn(
        `Stripe metadata fail: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }
}
