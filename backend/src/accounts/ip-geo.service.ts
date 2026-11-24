import { Injectable, Logger } from '@nestjs/common';

export type IpGeo = {
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  isp: string | null;
  label: string | null;
};

type Lookup =
  | { status: 'ok'; geo: IpGeo }
  | { status: 'private' | 'failed'; geo: null };

const OK_TTL_MS = 24 * 60 * 60_000;
const FAIL_TTL_MS = 5 * 60_000;
const MAX_CACHE = 2_000;

function isPublicIp(ip: string): boolean {
  const value = ip.trim().toLowerCase();
  if (!value) return false;
  if (value === '::1' || value === '::') return false;
  if (value.startsWith('127.') || value.startsWith('10.')) return false;
  if (/^192\.168\./.test(value) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(value))
    return false;
  if (value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80'))
    return false;
  return true;
}

function str(value: unknown, max = 120): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, max);
  return text || null;
}

function parseGeo(json: unknown): IpGeo | null {
  if (!json || typeof json !== 'object') return null;
  const data = json as Record<string, unknown>;
  if (data.success === false || data.status === 'fail' || data.error === true)
    return null;
  const connection =
    data.connection && typeof data.connection === 'object'
      ? (data.connection as Record<string, unknown>)
      : {};
  const city = str(data.city);
  const region = str(data.region ?? data.region_name ?? data.regionName);
  const country = str(data.country ?? data.country_name);
  const countryCode =
    str(data.country_code ?? data.countryCode, 8)?.toUpperCase() ?? null;
  const isp = str(connection.isp ?? connection.org ?? data.isp ?? data.org);
  const place = [city, region].filter(Boolean).join(', ');
  const label = [place, country].filter(Boolean).join(' · ') || null;
  if (!label && !isp) return null;
  return { city, region, country, countryCode, isp, label };
}

@Injectable()
export class IpGeoService {
  private readonly logger = new Logger(IpGeoService.name);
  private readonly cache = new Map<string, { at: number; result: Lookup }>();

  async lookup(ip: string | null | undefined): Promise<Lookup> {
    const raw = String(ip || '').trim();
    if (!raw || !isPublicIp(raw)) return { status: 'private', geo: null };

    const cached = this.cache.get(raw);
    if (cached) {
      const ttl = cached.result.status === 'ok' ? OK_TTL_MS : FAIL_TTL_MS;
      if (Date.now() - cached.at < ttl) return cached.result;
    }

    let result: Lookup = { status: 'failed', geo: null };
    try {
      const res = await fetch(`https://ipwho.is/${encodeURIComponent(raw)}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const geo = parseGeo(await res.json());
        if (geo) result = { status: 'ok', geo };
      }
    } catch (err) {
      this.logger.warn(
        `geo lookup falhou: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (this.cache.size >= MAX_CACHE) this.cache.clear();
    this.cache.set(raw, { at: Date.now(), result });
    return result;
  }
}
