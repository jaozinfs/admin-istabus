import type { EffectiveQuotas } from '../lib/types';

const LABELS: Array<{
  key: keyof EffectiveQuotas;
  usedKey?: keyof EffectiveQuotas;
  sourceKey: string;
  label: string;
}> = [
  { key: 'whatsappBroadcastMetaLimit', sourceKey: 'whatsappBroadcastMeta', label: 'WA disparo Meta' },
  {
    key: 'whatsappBroadcastBaileysLimit',
    sourceKey: 'whatsappBroadcastBaileys',
    label: 'WA disparo Baileys',
  },
  {
    key: 'whatsappGroupBaileysLimit',
    sourceKey: 'whatsappGroupBaileys',
    label: 'WA grupo Baileys',
  },
  { key: 'feedLimit', usedKey: 'feedUsed', sourceKey: 'feed', label: 'Feed' },
  { key: 'storyLimit', usedKey: 'storyUsed', sourceKey: 'story', label: 'Story' },
  { key: 'geniaLimit', usedKey: 'geniaUsed', sourceKey: 'genia', label: 'GenIA' },
  { key: 'genVideoLimit', usedKey: 'genVideoUsed', sourceKey: 'genVideo', label: 'Gen vídeo' },
  { key: 'instagramAccountsLimit', sourceKey: 'instagram', label: 'Instagram' },
  { key: 'tiktokAccountsLimit', sourceKey: 'tiktok', label: 'TikTok' },
  { key: 'linkedinAccountsLimit', sourceKey: 'linkedin', label: 'LinkedIn' },
  { key: 'youtubeChannelsLimit', sourceKey: 'youtube', label: 'YouTube' },
];

function sourceLabel(s: string) {
  if (s === 'stripe') return 'Stripe metadata';
  if (s === 'stored') return 'banco (manual)';
  return 'plano free';
}

export default function QuotaCards({
  effective,
}: {
  effective: EffectiveQuotas;
}) {
  return (
    <div className="quota-grid">
      {LABELS.map((item) => {
        const limit = Number(effective[item.key] ?? 0);
        const used = item.usedKey ? Number(effective[item.usedKey] ?? 0) : null;
        const source = effective.sources[item.sourceKey] || 'free';
        const pct =
          used != null && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
        return (
          <div className="quota-card" key={item.label}>
            <div className="q-label">{item.label}</div>
            <div className="q-value">
              {used != null ? `${used} / ${limit}` : limit}
            </div>
            <div className="q-meta">fonte: {sourceLabel(source)}</div>
            {used != null && (
              <div className="bar">
                <span style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
