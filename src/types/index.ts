import { Timestamp } from "firebase/firestore";

// ─── Shared ───────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "rep" | "customer";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  region?: string;
  workloadCap?: number;
  createdAt: Timestamp;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export type LeadSource =
  | "call"
  | "whatsapp"
  | "web"
  | "facebook"
  | "import"
  | "api";

export type LeadScore = "hot" | "warm" | "cold";

export type LeadStage = "cold" | "warm" | "confirmed" | "converted";

export interface Lead {
  id: string;
  fullName: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  source: LeadSource;
  productInterest: string;
  budget?: number;
  notes?: string;
  assignedRep: string; // uid of rep
  score: LeadScore;
  stage: LeadStage;
  isConverted: boolean;
  convertedAccountId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export type AccountType = "customer" | "prospect" | "partner" | "vendor" | "other";

export interface Account {
  id: string;
  name: string;
  type?: AccountType;
  phone?: string;
  email?: string;
  website?: string;
  industry?: string;
  address?: string;
  notes?: string;
  customerId?: string;       // Firebase Auth UID of the linked customer portal user
  driveFolderId?: string;
  tags: string[];
  customFields: Record<string, string>;
  isArchived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  accountId: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
  createdAt: Timestamp;
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export type OpportunityStage =
  | "new_lead"
  | "proposal_sent"
  | "negotiation"
  | "verbal_agree"
  | "closed_won"
  | "closed_lost";

export type LossReason =
  | "price_too_high"
  | "chose_competitor"
  | "went_silent"
  | "requirements_changed"
  | "other";

export interface Opportunity {
  id: string;
  accountId: string;
  leadId?: string;    // set when auto-created from a lead, cleared after conversion
  leadName?: string;  // display name used on Kanban before account exists
  pipeline: string;
  stage: OpportunityStage;
  value: number;
  probability: number;
  assignedRep: string;
  lossReason?: LossReason;
  lossNotes?: string;
  isStagnant: boolean;
  lastMovedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  accountId: string;
  name: string;
  type: string;
  stages: string[];
  currentStage: string;
  assignedRep: string;
  startDate: Timestamp;
  expectedEndDate: Timestamp;
  description?: string;
  driveFolderId?: string;
  memberUids?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProjectEvent {
  id: string;
  projectId: string;
  title: string;
  scheduledAt: Timestamp;
  assignedTo: string;
  visibility: "internal" | "customer";
  notes?: string;
  createdAt: Timestamp;
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus =
  | "open"
  | "in_progress"
  | "awaiting_customer"
  | "resolved"
  | "closed";
export type TicketSource = "portal" | "call" | "internal";

export interface Ticket {
  id: string;
  accountId: string;
  projectId?: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  source: TicketSource;
  assignedRep: string;
  dueDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorRole: UserRole;
  body: string;
  isInternal: boolean;
  createdAt: Timestamp;
}

// ─── Cases ────────────────────────────────────────────────────────────────────

export type CaseStatus =
  | "open"
  | "in_progress"
  | "escalated"
  | "resolved"
  | "closed";

export interface Case {
  id: string;
  accountId: string;
  relatedTicketId?: string;
  priority: TicketPriority;
  assignedTo: string;
  status: CaseStatus;
  dueDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Documents ────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  accountId: string;
  projectId?: string;
  driveFileId: string;
  name: string;
  type: string;
  uploader: string;
  uploaderRole: UserRole;
  visibility: "internal" | "customer";
  sizeBytes: number;
  createdAt: Timestamp;
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue";
export type PaymentMethod = "cash" | "bank_transfer" | "card" | "cheque" | "other";

export interface Invoice {
  id: string;
  projectId: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  dueDate: Timestamp;
  issuedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Payment {
  id: string;
  invoiceId: string;
  projectId: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
  paidAt: Timestamp;
  createdAt: Timestamp;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export type ActivityType =
  | "inbound_call"
  | "whatsapp_contact"
  | "rep_note"
  | "stage_change"
  | "document_upload"
  | "ticket_created"
  | "comment_added";

export interface Activity {
  id: string;
  type: ActivityType;
  entityId: string;
  entityType: "lead" | "account" | "opportunity" | "project";
  authorId: string;
  body: string;
  visibleToCustomer: boolean;
  createdAt: Timestamp;
}

// ─── Stage Templates ──────────────────────────────────────────────────────────

export interface StageTemplate {
  id: string;
  name: string;
  projectType: string;
  stages: string[];
  createdAt: Timestamp;
}
