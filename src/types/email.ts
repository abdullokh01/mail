import { Action, Category, Deadline, Priority } from "@prisma/client";

export interface AnalysisDTO {
  id: string;
  summary: string;
  priority: Priority;
  category: Category;
  requiresAction: boolean;
  suggestedAction: Action;
  deadline: Deadline;
  model: string;
}

export interface EmailAttachmentDTO {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailDTO {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string | null;
  receivedAt: string | Date;
  preview: string;
  body: string;
  bodyHtml?: string | null;
  attachmentCount: number;
  attachments?: EmailAttachmentDTO[] | null;
  isRead: boolean;
  repliedAt?: string | Date | null;
  analysis: AnalysisDTO | null;
}

export interface DashboardStats {
  total: number;
  critical: number;
  high: number;
  needReply: number;
  fyi: number;
}

export interface InsightStats {
  approvals: number; // suggested action = APPROVE, not yet handled
  dueToday: number; // deadline = TODAY, requires action, not handled
  handledToday: number; // replied today
  unreadImportant: number; // unread + requires action
  received: number; // total emails pulled into the inbox
  read: number; // emails marked read
  replied: number; // emails replied to from the app
}
