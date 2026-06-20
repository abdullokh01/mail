import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";

/**
 * Build an authenticated OAuth2 client for a user.
 * Persists refreshed tokens back to the Account row automatically
 * (googleapis emits a "tokens" event whenever it refreshes).
 */
export async function getOAuthClient(userId: string): Promise<OAuth2Client> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token) {
    throw new Error("No linked Google account. Please sign in again.");
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Persist any refreshed tokens.
  client.on("tokens", async (tokens) => {
    try {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token ?? account.access_token,
          expires_at: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : account.expires_at,
          // Google only returns refresh_token on first consent; keep existing otherwise.
          ...(tokens.refresh_token
            ? { refresh_token: tokens.refresh_token }
            : {}),
        },
      });
    } catch (err) {
      console.error("Failed to persist refreshed Google tokens", err);
    }
  });

  // Proactively refresh if the access token is expired / about to expire.
  const expiresAtMs = account.expires_at ? account.expires_at * 1000 : 0;
  if (account.refresh_token && expiresAtMs < Date.now() + 60_000) {
    await client.getAccessToken(); // triggers refresh + "tokens" event
  }

  return client;
}

export function getGmailClient(client: OAuth2Client) {
  return google.gmail({ version: "v1", auth: client });
}
