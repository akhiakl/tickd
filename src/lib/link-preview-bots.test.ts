import { describe, expect, it } from "vitest";
import { isLinkPreviewBot } from "./link-preview-bots";

describe("isLinkPreviewBot", () => {
  it.each([
    "WhatsApp/2.24.1.78 A",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Twitterbot/1.0",
    "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
    "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
    "TelegramBot (like TwitterBot)",
    "LinkedInBot/1.0 (compatible; Mozilla/5.0; Jakarta Commons-HttpClient/3.1 +http://www.linkedin.com)",
    "Mozilla/5.0 (compatible; SkypeUriPreview Preview/0.5)",
    "Mozilla/5.0 (compatible; redditbot/1.0; +http://www.reddit.com/feedback)",
    "Pinterest/0.2 (+https://www.pinterest.com/bot.html)",
  ])("recognizes a known link-preview crawler UA: %s", (userAgent) => {
    expect(isLinkPreviewBot(userAgent)).toBe(true);
  });

  it.each([
    null,
    "",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Googlebot/2.1 (+http://www.google.com/bot.html)",
    "curl/8.4.0",
  ])(
    "does not treat a real browser, an unlisted bot, or a missing UA as a preview bot: %s",
    (userAgent) => {
      expect(isLinkPreviewBot(userAgent)).toBe(false);
    },
  );
});
