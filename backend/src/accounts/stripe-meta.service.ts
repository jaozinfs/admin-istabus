import { Injectable, Logger } from '@nestjs/common';

export type StripeMetaResult = {
  ok: boolean;
  status: 'ok' | 'missing_key' | 'http_error' | 'timeout' | 'empty' | 'no_product';
  meta: Record<string, string>;
  httpStatus?: number;
};

@Injectable()
export class StripeMetaService {
  private readonly logger = new Logger(StripeMetaService.name);
  private readonly cache = new Map<string, { at: number; result: StripeMetaResult }>();

  async getProductMetadata(
    productId: string | null | undefined,
  ): Promise<StripeMetaResult> {
    const pid = productId?.trim();
    if (!pid) {
      return { ok: false, status: 'no_product', meta: {} };
    }
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) {
      return { ok: false, status: 'missing_key', meta: {} };
    }

    const cached = this.cache.get(pid);
    if (cached && Date.now() - cached.at < 60_000) return cached.result;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4_000);
    try {
      const res = await fetch(`https://api.stripe.com/v1/products/${pid}`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
      if (!res.ok) {
        const result: StripeMetaResult = {
          ok: false,
          status: 'http_error',
          meta: {},
          httpStatus: res.status,
        };
        this.cache.set(pid, { at: Date.now(), result });
        this.logger.warn(`Stripe product ${pid} → HTTP ${res.status}`);
        return result;
      }
      const data = (await res.json()) as { metadata?: Record<string, string> };
      const meta = data.metadata ?? {};
      const keys = Object.keys(meta);
      const result: StripeMetaResult = {
        ok: keys.length > 0,
        status: keys.length > 0 ? 'ok' : 'empty',
        meta,
      };
      this.cache.set(pid, { at: Date.now(), result });
      return result;
    } catch (e) {
      const aborted =
        e instanceof Error &&
        (e.name === 'AbortError' || /aborted/i.test(e.message));
      const result: StripeMetaResult = {
        ok: false,
        status: aborted ? 'timeout' : 'http_error',
        meta: {},
      };
      this.logger.warn(
        `Stripe metadata fail: ${e instanceof Error ? e.message : String(e)}`,
      );
      // cache short failures briefly so UI doesn't hang repeatedly
      this.cache.set(pid, { at: Date.now(), result });
      return result;
    } finally {
      clearTimeout(timer);
    }
  }
}
