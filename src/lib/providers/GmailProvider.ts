import { getGmailClient, getOAuthClient } from "@/lib/google";
import {
  getParsedMessage,
  listMessageIds,
  getThreadMessages,
  sendReply,
  getAttachment,
  getMessageIdHeader,
} from "@/lib/gmail";
import type { EmailProvider } from "./EmailProvider";
import type { ParsedEmail, SendReplyParams, ThreadMessage } from "@/lib/gmail";

export class GmailProvider implements EmailProvider {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private async getClient() {
    const oauth = await getOAuthClient(this.userId);
    return getGmailClient(oauth);
  }

  async listMessageIds(max: number): Promise<string[]> {
    const gmail = await this.getClient();
    return listMessageIds(gmail, max);
  }

  async getParsedMessage(id: string): Promise<ParsedEmail | null> {
    const gmail = await this.getClient();
    return getParsedMessage(gmail, id);
  }

  async getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
    const gmail = await this.getClient();
    return getThreadMessages(gmail, threadId);
  }

  async sendEmail(params: SendReplyParams): Promise<string> {
    const gmail = await this.getClient();
    
    // Convert target message's UID/id to the RFC message-id header for proper thread headers.
    let inReplyToHeader: string | null = null;
    if (params.inReplyTo) {
      inReplyToHeader = await getMessageIdHeader(gmail, params.inReplyTo).catch(() => null);
    }

    return sendReply(gmail, {
      to: params.to,
      subject: params.subject,
      body: params.body,
      threadId: params.threadId,
      inReplyTo: inReplyToHeader,
    });
  }

  async getAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    const gmail = await this.getClient();
    return getAttachment(gmail, messageId, attachmentId);
  }
}
