import { IMAPProvider } from "./IMAPProvider";
import { GmailProvider } from "./GmailProvider";
import type { EmailProvider } from "./EmailProvider";

/**
 * Factory function to retrieve the configured EmailProvider.
 * Defaults to IMAPProvider.
 */
export function getEmailProvider(userId: string): EmailProvider {
  const providerType = process.env.EMAIL_PROVIDER_TYPE || "IMAP";

  if (providerType.toUpperCase() === "GMAIL") {
    return new GmailProvider(userId);
  }

  return new IMAPProvider(userId);
}
