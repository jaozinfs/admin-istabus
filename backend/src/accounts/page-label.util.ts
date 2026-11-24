/** Mapeia rota de API InstaBuss → área de produto legível no admin. */
export function labelApiPath(path: string | null | undefined): string {
  const raw = String(path || '')
    .split('?')[0]
    .trim();
  if (!raw) return 'Desconhecido';
  const p = raw.startsWith('/') ? raw : `/${raw}`;
  const rules: Array<[RegExp, string]> = [
    [/^\/auth(\/|$)/i, 'Login / Auth'],
    [/^\/whatsapp(\/|$)/i, 'WhatsApp'],
    [/^\/posts(\/|$)/i, 'Cronograma / Posts'],
    [/^\/post-drafts(\/|$)/i, 'Rascunhos'],
    [/^\/instagram(\/|$)/i, 'Instagram'],
    [/^\/tiktok(\/|$)/i, 'TikTok'],
    [/^\/linkedin(\/|$)/i, 'LinkedIn'],
    [/^\/youtube(\/|$)/i, 'YouTube'],
    [/^\/instagen(\/|$)/i, 'InstaGen'],
    [/^\/prompt-vault(\/|$)/i, 'Template Hub'],
    [/^\/reel-creator(\/|$)/i, 'Reel Creator'],
    [/^\/pricing(\/|$)/i, 'Catálogo de preços'],
    [/^\/billing(\/|$)/i, 'Planos / Billing'],
    [/^\/companies(\/|$)/i, 'Empresa / Equipe'],
    [/^\/settings(\/|$)/i, 'Configurações'],
    [/^\/assistant(\/|$)/i, 'Assistente'],
    [/^\/automations(\/|$)/i, 'Automações'],
    [/^\/meta-ads(\/|$)/i, 'Meta Ads'],
    [/^\/google-ads(\/|$)/i, 'Google Ads'],
    [/^\/ad-campaigns(\/|$)/i, 'Campanhas'],
    [/^\/ai(\/|$)/i, 'IA'],
    [/^\/media(\/|$)/i, 'Mídia'],
    [/^\/support(\/|$)/i, 'Suporte'],
  ];
  for (const [re, label] of rules) {
    if (re.test(p)) return label;
  }
  const segment = p.split('/').filter(Boolean)[0];
  return segment ? segment : p;
}
