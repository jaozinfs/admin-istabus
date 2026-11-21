export type QuotaBlock = {
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

export type EffectiveQuotaBlock = {
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

export type FreeDefaults = {
  feed: number;
  story: number;
  genia: number;
  genVideo: number;
  whatsappGroupBaileys: number;
  whatsappBroadcastBaileys: number;
  whatsappBroadcastMeta: number;
  instagramAccounts: number;
  tiktokAccounts: number;
  linkedinAccounts: number;
  youtubeChannels: number;
};

function envInt(name: string, fallback: number): number {
  const n = parseInt(process.env[name] || '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function freeDefaults(): FreeDefaults {
  return {
    feed: envInt('FREE_QUOTA_FEED', 5),
    story: envInt('FREE_QUOTA_STORY', 5),
    genia: envInt('FREE_QUOTA_GENIA', 3),
    genVideo: envInt('FREE_QUOTA_GEN_VIDEO', 0),
    whatsappGroupBaileys: envInt('FREE_QUOTA_WHATSAPP_GROUP_BAILEYS', 0),
    whatsappBroadcastBaileys: envInt('FREE_QUOTA_WHATSAPP_BROADCAST_BAILEYS', 0),
    whatsappBroadcastMeta: envInt('FREE_QUOTA_WHATSAPP_BROADCAST_META', 0),
    instagramAccounts: envInt('FREE_QUOTA_INSTAGRAM_ACCOUNTS', 1),
    tiktokAccounts: envInt('FREE_QUOTA_TIKTOK_ACCOUNTS', 1),
    linkedinAccounts: envInt('FREE_QUOTA_LINKEDIN_ACCOUNTS', 1),
    youtubeChannels: envInt('FREE_QUOTA_YOUTUBE_CHANNELS', 1),
  };
}

export function mapQuotas(row: {
  quotaFeedLimit: number | null;
  quotaFeedUsed: number;
  quotaStoryLimit: number | null;
  quotaStoryUsed: number;
  quotaGeniaLimit: number | null;
  quotaGeniaUsed: number;
  quotaGenVideoLimit: number | null;
  quotaGenVideoUsed: number;
  quotaWhatsappGroupBaileysLimit: number | null;
  quotaWhatsappBroadcastBaileysLimit: number | null;
  quotaWhatsappBroadcastMetaLimit: number | null;
  quotaInstagramAccountsLimit: number | null;
  quotaTiktokAccountsLimit: number | null;
  quotaLinkedinAccountsLimit: number | null;
  quotaYoutubeChannelsLimit: number | null;
  quotaPeriodEnd: Date | null;
}): QuotaBlock {
  return {
    feedLimit: row.quotaFeedLimit,
    feedUsed: row.quotaFeedUsed,
    storyLimit: row.quotaStoryLimit,
    storyUsed: row.quotaStoryUsed,
    geniaLimit: row.quotaGeniaLimit,
    geniaUsed: row.quotaGeniaUsed,
    genVideoLimit: row.quotaGenVideoLimit,
    genVideoUsed: row.quotaGenVideoUsed,
    whatsappGroupBaileysLimit: row.quotaWhatsappGroupBaileysLimit,
    whatsappBroadcastBaileysLimit: row.quotaWhatsappBroadcastBaileysLimit,
    whatsappBroadcastMetaLimit: row.quotaWhatsappBroadcastMetaLimit,
    instagramAccountsLimit: row.quotaInstagramAccountsLimit,
    tiktokAccountsLimit: row.quotaTiktokAccountsLimit,
    linkedinAccountsLimit: row.quotaLinkedinAccountsLimit,
    youtubeChannelsLimit: row.quotaYoutubeChannelsLimit,
    periodEnd: row.quotaPeriodEnd?.toISOString() ?? null,
  };
}

type StripeMeta = Record<string, string | undefined>;

function pickMetaInt(meta: StripeMeta | null, key: string): number | null {
  if (!meta) return null;
  const raw = meta[key];
  if (raw == null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Snapshot do banco primeiro (feed/story/social). */
function resolveStoredFirst(
  stored: number | null | undefined,
  stripeVal: number | null,
  freeVal: number,
  active: boolean,
): { value: number; source: 'stored' | 'stripe' | 'free' } {
  if (stored != null) return { value: stored, source: 'stored' };
  if (active && stripeVal != null) return { value: stripeVal, source: 'stripe' };
  return { value: freeVal, source: 'free' };
}

/**
 * Paridade com InstaBuss (quota.service): plano ativo → metadata Stripe
 * atual vence o snapshot salvo na assinatura (ex.: cota WA Meta antiga 300).
 */
function resolveStripeFirst(
  stored: number | null | undefined,
  stripeVal: number | null,
  freeVal: number,
  active: boolean,
): { value: number; source: 'stored' | 'stripe' | 'free' } {
  if (active && stripeVal != null) return { value: stripeVal, source: 'stripe' };
  if (stored != null) return { value: stored, source: 'stored' };
  return { value: freeVal, source: 'free' };
}

export function resolveEffectiveQuotas(
  raw: QuotaBlock,
  opts: {
    active: boolean;
    stripeMeta?: StripeMeta | null;
  },
): EffectiveQuotaBlock {
  const free = freeDefaults();
  const meta = opts.stripeMeta ?? null;
  const active = opts.active;

  const feed = resolveStoredFirst(
    raw.feedLimit,
    pickMetaInt(meta, 'cota_feed'),
    free.feed,
    active,
  );
  const story = resolveStoredFirst(
    raw.storyLimit,
    pickMetaInt(meta, 'cota_story'),
    free.story,
    active,
  );
  const genia = resolveStripeFirst(
    raw.geniaLimit,
    pickMetaInt(meta, 'cota_genia'),
    free.genia,
    active,
  );
  const genVideo = resolveStripeFirst(
    raw.genVideoLimit,
    pickMetaInt(meta, 'cota_gen_video'),
    free.genVideo,
    active,
  );
  const waGroup = resolveStripeFirst(
    raw.whatsappGroupBaileysLimit,
    pickMetaInt(meta, 'cota_whatsapp_grupo_baileys'),
    free.whatsappGroupBaileys,
    active,
  );
  const waBaileys = resolveStripeFirst(
    raw.whatsappBroadcastBaileysLimit,
    pickMetaInt(meta, 'cota_whatsapp_disparo_baileys'),
    free.whatsappBroadcastBaileys,
    active,
  );
  const waMeta = resolveStripeFirst(
    raw.whatsappBroadcastMetaLimit,
    pickMetaInt(meta, 'cota_whatsapp_disparo_meta'),
    free.whatsappBroadcastMeta,
    active,
  );
  const ig = resolveStoredFirst(
    raw.instagramAccountsLimit,
    pickMetaInt(meta, 'cota_instagram'),
    free.instagramAccounts,
    active,
  );
  const tk = resolveStoredFirst(
    raw.tiktokAccountsLimit,
    pickMetaInt(meta, 'cota_tiktok'),
    free.tiktokAccounts,
    active,
  );
  const li = resolveStoredFirst(
    raw.linkedinAccountsLimit,
    pickMetaInt(meta, 'cota_linkedin'),
    free.linkedinAccounts,
    active,
  );
  const yt = resolveStoredFirst(
    raw.youtubeChannelsLimit,
    pickMetaInt(meta, 'cota_youtube'),
    free.youtubeChannels,
    active,
  );

  return {
    feedLimit: feed.value,
    feedUsed: raw.feedUsed,
    storyLimit: story.value,
    storyUsed: raw.storyUsed,
    geniaLimit: genia.value,
    geniaUsed: raw.geniaUsed,
    genVideoLimit: genVideo.value,
    genVideoUsed: raw.genVideoUsed,
    whatsappGroupBaileysLimit: waGroup.value,
    whatsappBroadcastBaileysLimit: waBaileys.value,
    whatsappBroadcastMetaLimit: waMeta.value,
    instagramAccountsLimit: ig.value,
    tiktokAccountsLimit: tk.value,
    linkedinAccountsLimit: li.value,
    youtubeChannelsLimit: yt.value,
    periodEnd: raw.periodEnd,
    sources: {
      feed: feed.source,
      story: story.source,
      genia: genia.source,
      genVideo: genVideo.source,
      whatsappGroupBaileys: waGroup.source,
      whatsappBroadcastBaileys: waBaileys.source,
      whatsappBroadcastMeta: waMeta.source,
      instagram: ig.source,
      tiktok: tk.source,
      linkedin: li.source,
      youtube: yt.source,
    },
  };
}

export function isActiveStatus(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}
