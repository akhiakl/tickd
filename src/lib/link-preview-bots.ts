/**
 * User-agent substrings for the crawlers that generate link-preview cards
 * on social/messaging platforms (WhatsApp, iMessage via Facebook's shared
 * crawler infra, Slack, Discord, Telegram, LinkedIn, X/Twitter). Used only
 * to let these specific requests reach `/join`'s metadata without the
 * sign-in redirect middleware would otherwise send every unauthenticated
 * visitor through - see `src/proxy.ts`. A real person still hits that
 * redirect exactly as before; this list only ever widens who can *read*
 * `/join`'s <head>, never who can act on the page.
 */
const LINK_PREVIEW_BOT_PATTERN =
  /WhatsApp|facebookexternalhit|Twitterbot|Slackbot|Discordbot|TelegramBot|LinkedInBot|SkypeUriPreview|redditbot|Pinterest/i;

export function isLinkPreviewBot(userAgent: string | null): boolean {
  return userAgent != null && LINK_PREVIEW_BOT_PATTERN.test(userAgent);
}
