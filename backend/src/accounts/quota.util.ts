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
