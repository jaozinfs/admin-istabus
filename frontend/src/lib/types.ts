export type EffectiveQuotas = {
  feedLimit: number;
  feedUsed: number;
  storyLimit: number;
  storyUsed: number;
  geniaLimit: number;
  geniaUsed: number;
  genVideoLimit: number;
  genVideoUsed: number;
  whatsappGroupBaileysLimit: number;
  whatsappBroadcastBaileysLimit: number;
  whatsappBroadcastMetaLimit: number;
  instagramAccountsLimit: number;
  tiktokAccountsLimit: number;
  linkedinAccountsLimit: number;
  youtubeChannelsLimit: number;
  periodEnd: string | null;
  sources: Record<string, 'stored' | 'stripe' | 'free'>;
};

export type StoredQuotas = {
  feedLimit: number | null;
  feedUsed: number;
  storyLimit: number | null;
  storyUsed: number;
  geniaLimit: number | null;
  geniaUsed: number;
  genVideoLimit: number | null;
  genVideoUsed: number;
  whatsappGroupBaileysLimit: number | null;
  whatsappBroadcastBaileysLimit: number | null;
  whatsappBroadcastMetaLimit: number | null;
  instagramAccountsLimit: number | null;
  tiktokAccountsLimit: number | null;
  linkedinAccountsLimit: number | null;
  youtubeChannelsLimit: number | null;
  periodEnd: string | null;
};

export type PlanInfo = {
  stripeProductId: string | null;
  stripeSubscriptionStatus: string | null;
  stripePriceId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  active?: boolean;
  scope?: string;
};
