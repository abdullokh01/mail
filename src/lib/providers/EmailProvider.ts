import type { ParsedEmail, SendReplyParams, ThreadMessage } from "@/lib/gmail";

export interface EmailProvider {
  /**
   * List the newest message IDs (or UIDs) from the inbox, up to max limit.
   */
  listMessageIds(max: number): Promise<string[]>;

  /**
   * Fetch and parse a single message by its ID/UID.
   */
  getParsedMessage(id: string): Promise<ParsedEmail | null>;

  /**
   * Fetch the list of messages in a thread / conversation.
   */
  getThreadMessages(threadId: string): Promise<ThreadMessage[]>;

  /**
   * Send a reply or plain text email.
   */
  sendEmail(params: SendReplyParams): Promise<string>;

  /**
   * Fetch raw binary attachment content.
   */
  getAttachment(messageId: string, attachmentId: string): Promise<Buffer>;
}
