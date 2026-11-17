type StripeMeta = {
  status: string;
  ok: boolean;
  keys: Record<string, string>;
  waMetaFromStripe?: string | null;
};

const LABELS: Record<string, string> = {
  ok: 'Stripe OK',
  empty: 'Stripe vazio',
  missing_key: 'sem STRIPE_SECRET_KEY',
  http_error: 'erro HTTP Stripe',
  timeout: 'timeout Stripe',
  no_product: 'sem product',
  skipped_inactive: 'plano inativo',
};

export default function StripeMetaBadge({ meta }: { meta?: StripeMeta | null }) {
  if (!meta) {
    return <span className="badge">meta Stripe: —</span>;
  }
  const label = LABELS[meta.status] || meta.status;
  const wa = meta.waMetaFromStripe ?? meta.keys?.cota_whatsapp_disparo_meta;
  return (
    <>
      <span className={`badge ${meta.ok ? 'ok' : 'warn'}`}>meta Stripe: {label}</span>
      {wa != null && wa !== '' && (
        <span className="badge accent mono">cota_whatsapp_disparo_meta={wa}</span>
      )}
    </>
  );
}
