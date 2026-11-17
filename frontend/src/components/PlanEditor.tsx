import { FormEvent, useState } from 'react';
import { api } from '../lib/api';
import type { PlanInfo, StoredQuotas } from '../lib/types';

type Props = {
  scope: 'user' | 'company';
  id: string;
  plan: PlanInfo;
  stored: StoredQuotas;
  onSaved: () => void;
  onToast: (msg: string, kind?: 'ok' | 'error') => void;
};

function numOrEmpty(v: number | null | undefined) {
  return v == null ? '' : String(v);
}

export default function PlanEditor({
  scope,
  id,
  plan,
  stored,
  onSaved,
  onToast,
}: Props) {
  const [stripeProductId, setProduct] = useState(plan.stripeProductId || '');
  const [stripeSubscriptionStatus, setStatus] = useState(
    plan.stripeSubscriptionStatus || 'active',
  );
  const [stripePriceId, setPrice] = useState(plan.stripePriceId || '');
  const [waMeta, setWaMeta] = useState(numOrEmpty(stored.whatsappBroadcastMetaLimit));
  const [waBaileys, setWaBaileys] = useState(
    numOrEmpty(stored.whatsappBroadcastBaileysLimit),
  );
  const [waGroup, setWaGroup] = useState(numOrEmpty(stored.whatsappGroupBaileysLimit));
  const [feed, setFeed] = useState(numOrEmpty(stored.feedLimit));
  const [story, setStory] = useState(numOrEmpty(stored.storyLimit));
  const [genia, setGenia] = useState(numOrEmpty(stored.geniaLimit));
  const [password, setPassword] = useState('');
  const [askPass, setAskPass] = useState(false);
  const [loading, setLoading] = useState(false);

  function parseOpt(v: string): number | null | undefined {
    if (v.trim() === '') return undefined;
    if (v.trim().toLowerCase() === 'null') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!askPass) {
      setAskPass(true);
      return;
    }
    if (!password || password.length < 8) {
      onToast('Informe a senha do admin', 'error');
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        scope,
        id,
        confirmPassword: password,
        stripeProductId: stripeProductId || null,
        stripeSubscriptionStatus: stripeSubscriptionStatus || null,
        stripePriceId: stripePriceId || null,
      };
      const wm = parseOpt(waMeta);
      const wb = parseOpt(waBaileys);
      const wg = parseOpt(waGroup);
      const f = parseOpt(feed);
      const s = parseOpt(story);
      const g = parseOpt(genia);
      if (wm !== undefined) body.quotaWhatsappBroadcastMetaLimit = wm;
      if (wb !== undefined) body.quotaWhatsappBroadcastBaileysLimit = wb;
      if (wg !== undefined) body.quotaWhatsappGroupBaileysLimit = wg;
      if (f !== undefined) body.quotaFeedLimit = f;
      if (s !== undefined) body.quotaStoryLimit = s;
      if (g !== undefined) body.quotaGeniaLimit = g;

      await api('/accounts/plan', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setPassword('');
      setAskPass(false);
      onToast('Plano / cotas atualizados');
      onSaved();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Falha ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="panel stack" onSubmit={submit}>
        <div>
          <strong>Editar plano e cotas</strong>
          <p className="hint" style={{ margin: '0.35rem 0 0' }}>
            Campos vazios = não altera. Digite <span className="mono">null</span> para
            limpar (volta free/Stripe). Sempre pede senha do admin.
          </p>
        </div>

        <label className="field-label">stripe_product_id</label>
        <input value={stripeProductId} onChange={(e) => setProduct(e.target.value)} />

        <label className="field-label">status</label>
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

        <label className="field-label">stripe_price_id</label>
        <input value={stripePriceId} onChange={(e) => setPrice(e.target.value)} />

        <label className="field-label">cota WA Meta (banco)</label>
        <input
          placeholder="ex: 5000 ou null"
          value={waMeta}
          onChange={(e) => setWaMeta(e.target.value)}
        />
        <label className="field-label">cota WA Baileys broadcast</label>
        <input value={waBaileys} onChange={(e) => setWaBaileys(e.target.value)} />
        <label className="field-label">cota WA Baileys grupo</label>
        <input value={waGroup} onChange={(e) => setWaGroup(e.target.value)} />
        <label className="field-label">cota feed</label>
        <input value={feed} onChange={(e) => setFeed(e.target.value)} />
        <label className="field-label">cota story</label>
        <input value={story} onChange={(e) => setStory(e.target.value)} />
        <label className="field-label">cota genia</label>
        <input value={genia} onChange={(e) => setGenia(e.target.value)} />

        <button disabled={loading} type="submit">
          {loading ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </form>

      {askPass && (
        <div className="modal-backdrop" onClick={() => !loading && setAskPass(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar com senha</h3>
            <p className="hint">
              Digite a senha do operador admin para aplicar mudanças de plano/cotas.
            </p>
            <form className="stack" onSubmit={submit}>
              <input
                type="password"
                autoFocus
                placeholder="senha do admin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="toolbar" style={{ marginBottom: 0 }}>
                <button type="submit" disabled={loading}>
                  Confirmar
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={loading}
                  onClick={() => setAskPass(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
