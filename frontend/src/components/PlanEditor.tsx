import { FormEvent, useState } from 'react';
import { api } from '../lib/api';

type Props = {
  scope: 'user' | 'company';
  id: string;
  initial: {
    stripeProductId: string | null;
    stripeSubscriptionStatus: string | null;
    stripePriceId?: string | null;
    quotaWhatsappBroadcastMetaLimit?: number | null;
    quotaFeedLimit?: number | null;
    quotaStoryLimit?: number | null;
    quotaGeniaLimit?: number | null;
  };
  onSaved: () => void;
};

export default function PlanEditor({ scope, id, initial, onSaved }: Props) {
  const [stripeProductId, setProduct] = useState(initial.stripeProductId || '');
  const [stripeSubscriptionStatus, setStatus] = useState(
    initial.stripeSubscriptionStatus || 'active',
  );
  const [stripePriceId, setPrice] = useState(initial.stripePriceId || '');
  const [quotaWhatsappBroadcastMetaLimit, setWaMeta] = useState(
    initial.quotaWhatsappBroadcastMetaLimit?.toString() || '',
  );
  const [quotaFeedLimit, setFeed] = useState(
    initial.quotaFeedLimit?.toString() || '',
  );
  const [quotaStoryLimit, setStory] = useState(
    initial.quotaStoryLimit?.toString() || '',
  );
  const [quotaGeniaLimit, setGenia] = useState(
    initial.quotaGeniaLimit?.toString() || '',
  );
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const body: Record<string, unknown> = {
        scope,
        id,
        stripeProductId: stripeProductId || null,
        stripeSubscriptionStatus: stripeSubscriptionStatus || null,
        stripePriceId: stripePriceId || null,
      };
      if (quotaWhatsappBroadcastMetaLimit !== '') {
        body.quotaWhatsappBroadcastMetaLimit = Number(
          quotaWhatsappBroadcastMetaLimit,
        );
      }
      if (quotaFeedLimit !== '') body.quotaFeedLimit = Number(quotaFeedLimit);
      if (quotaStoryLimit !== '') body.quotaStoryLimit = Number(quotaStoryLimit);
      if (quotaGeniaLimit !== '') body.quotaGeniaLimit = Number(quotaGeniaLimit);

      await api('/accounts/plan', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setMsg('Plano atualizado');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel stack" onSubmit={onSubmit}>
      <strong>Alterar plano</strong>
      <label className="muted">stripe_product_id</label>
      <input value={stripeProductId} onChange={(e) => setProduct(e.target.value)} />
      <label className="muted">stripe_subscription_status</label>
      <select
        value={stripeSubscriptionStatus}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="active">active</option>
        <option value="trialing">trialing</option>
        <option value="canceled">canceled</option>
        <option value="past_due">past_due</option>
        <option value="">(null / free)</option>
      </select>
      <label className="muted">stripe_price_id</label>
      <input value={stripePriceId} onChange={(e) => setPrice(e.target.value)} />
      <label className="muted">cota_whatsapp_disparo_meta (vazio = não altera)</label>
      <input
        value={quotaWhatsappBroadcastMetaLimit}
        onChange={(e) => setWaMeta(e.target.value)}
      />
      <label className="muted">cota_feed</label>
      <input value={quotaFeedLimit} onChange={(e) => setFeed(e.target.value)} />
      <label className="muted">cota_story</label>
      <input value={quotaStoryLimit} onChange={(e) => setStory(e.target.value)} />
      <label className="muted">cota_genia</label>
      <input value={quotaGeniaLimit} onChange={(e) => setGenia(e.target.value)} />
      <button disabled={loading}>Salvar plano</button>
      {msg && <div className="muted">{msg}</div>}
      {error && <div className="error">{error}</div>}
    </form>
  );
}
