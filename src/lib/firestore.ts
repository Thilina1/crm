import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Lead, Account, AppUser } from "@/types";

// ─── Collection refs ──────────────────────────────────────────────────────────

export const leadsCol = () => collection(db, "leads");
export const accountsCol = () => collection(db, "accounts");
export const contactsCol = () => collection(db, "contacts");
export const opportunitiesCol = () => collection(db, "opportunities");
export const projectsCol = () => collection(db, "projects");
export const ticketsCol = () => collection(db, "tickets");
export const casesCol = () => collection(db, "cases");
export const usersCol = () => collection(db, "users");
export const documentsCol = () => collection(db, "documents");
export const stageTemplatesCol = () => collection(db, "stageTemplates");

export const activitiesCol = (parentCol: string, parentId: string) =>
  collection(db, parentCol, parentId, "activities");

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function createLead(data: Omit<Lead, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(leadsCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getLeads(constraints: QueryConstraint[] = []) {
  const q = query(leadsCol(), orderBy("createdAt", "desc"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lead));
}

export async function getLead(id: string) {
  const snap = await getDoc(doc(db, "leads", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Lead;
}

export async function updateLead(id: string, data: Partial<Lead>) {
  await updateDoc(doc(db, "leads", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function findDuplicateLead(phone: string, email?: string) {
  const byPhone = query(leadsCol(), where("phone", "==", phone), limit(1));
  const phoneSnap = await getDocs(byPhone);
  if (!phoneSnap.empty) return { id: phoneSnap.docs[0].id, ...phoneSnap.docs[0].data() } as Lead;

  if (email) {
    const byEmail = query(leadsCol(), where("email", "==", email), limit(1));
    const emailSnap = await getDocs(byEmail);
    if (!emailSnap.empty) return { id: emailSnap.docs[0].id, ...emailSnap.docs[0].data() } as Lead;
  }

  return null;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

import type { AccountType } from "@/types";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  customer: "Customer",
  prospect: "Prospect",
  partner: "Partner",
  vendor: "Vendor",
  other: "Other",
};

export const ACCOUNT_TYPE_COLORS: Record<AccountType, { bg: string; text: string; border: string }> = {
  customer: { bg: "bg-indigo-50",  text: "text-indigo-600",  border: "border-indigo-100" },
  prospect: { bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-100"   },
  partner:  { bg: "bg-violet-50",  text: "text-violet-600",  border: "border-violet-100" },
  vendor:   { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100"},
  other:    { bg: "bg-slate-100",  text: "text-slate-500",   border: "border-slate-200"  },
};

export async function createAccount(data: Omit<Account, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(accountsCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getAccounts() {
  // Single-field queries avoid composite index requirements; sort client-side
  const q = query(accountsCol(), where("isArchived", "==", false));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Account))
    .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
}

export async function getAccount(id: string) {
  const snap = await getDoc(doc(db, "accounts", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Account;
}

export async function updateAccount(id: string, data: Partial<Account>) {
  await updateDoc(doc(db, "accounts", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function provisionCustomerLogin(accountId: string): Promise<{
  success: boolean;
  email?: string;
  isNew?: boolean;
  error?: string;
}> {
  const res = await fetch("/api/accounts/create-customer", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ accountId }),
  });
  return res.json();
}

export async function convertLeadAndProvision(
  leadId: string,
  opportunityId: string
): Promise<{
  success: boolean;
  email?: string;
  accountId?: string;
  isNew?: boolean;
  noEmail?: boolean;
  error?: string;
}> {
  const res = await fetch("/api/leads/convert-won", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ leadId, opportunityId }),
  });
  return res.json();
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUser(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as AppUser;
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const q = query(usersCol(), where("email", "==", email), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() } as AppUser;
}

export async function createCustomerProfile(uid: string, name: string, email: string) {
  await setDoc(doc(db, "users", uid), {
    name,
    email,
    role:      "customer",
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export async function createUser(uid: string, data: Omit<AppUser, "uid" | "createdAt">) {
  await setDoc(doc(db, "users", uid), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function getReps() {
  const q = query(usersCol(), where("role", "in", ["rep", "admin"]));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser));
}

export async function getAllUsers(): Promise<AppUser[]> {
  const snap = await getDocs(usersCol());
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() } as AppUser))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

// ─── Opportunities ────────────────────────────────────────────────────────────

import type { Opportunity, OpportunityStage, LossReason } from "@/types";

export const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  new_lead: 10,
  proposal_sent: 30,
  negotiation: 60,
  verbal_agree: 80,
  closed_won: 100,
  closed_lost: 0,
};

export const PIPELINE_STAGES: OpportunityStage[] = [
  "new_lead",
  "proposal_sent",
  "negotiation",
  "verbal_agree",
  "closed_won",
  "closed_lost",
];

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  new_lead: "New Lead",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  verbal_agree: "Verbal Agree",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export async function createOpportunity(
  data: Omit<Opportunity, "id" | "createdAt" | "updatedAt" | "isStagnant" | "lastMovedAt">
) {
  const ref = await addDoc(opportunitiesCol(), {
    ...data,
    probability: STAGE_PROBABILITY[data.stage],
    isStagnant: false,
    lastMovedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getOpportunities(pipeline?: string) {
  const constraints = pipeline ? [where("pipeline", "==", pipeline)] : [];
  const q = query(opportunitiesCol(), ...constraints);
  const snap = await getDocs(q);
  const opps = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Opportunity))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));

  // Mark stagnant client-side (> 7 days without stage move)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return opps.map((o) => ({
    ...o,
    isStagnant:
      !["closed_won", "closed_lost"].includes(o.stage) &&
      o.lastMovedAt?.toMillis() < sevenDaysAgo,
  }));
}

export async function getOpportunityByLeadId(leadId: string) {
  const q = query(opportunitiesCol(), where("leadId", "==", leadId), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Opportunity;
}

export async function updateOpportunityStage(
  id: string,
  stage: OpportunityStage,
  extra?: { lossReason?: LossReason; lossNotes?: string }
) {
  await updateDoc(doc(db, "opportunities", id), {
    stage,
    probability: STAGE_PROBABILITY[stage],
    isStagnant: false,
    lastMovedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(extra ?? {}),
  });
}

export async function updateOpportunity(id: string, data: Partial<Opportunity>) {
  await updateDoc(doc(db, "opportunities", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getOpportunity(id: string) {
  const snap = await getDoc(doc(db, "opportunities", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Opportunity;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

import type { Project, ProjectEvent } from "@/types";

export const DEFAULT_STAGE_TEMPLATES: Record<string, string[]> = {
  installation: ["Survey", "Design", "Materials Ordered", "Installation", "Testing", "Handover"],
  service_contract: ["Onboarding", "Active", "Review", "Renewal"],
  construction: ["Planning", "Permits", "Foundation", "Build", "Finishing", "Inspection", "Handover"],
  maintenance: ["Assessment", "Scheduling", "In Progress", "Quality Check", "Complete"],
  consultation: ["Discovery", "Proposal", "Execution", "Review", "Complete"],
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  installation: "Installation",
  service_contract: "Service Contract",
  construction: "Construction",
  maintenance: "Maintenance",
  consultation: "Consultation",
};

export async function createProject(
  data: Omit<Project, "id" | "createdAt" | "updatedAt">
) {
  const ref = await addDoc(projectsCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getProjects(accountId?: string) {
  const constraints = accountId ? [where("accountId", "==", accountId)] : [];
  const q = query(projectsCol(), ...constraints);
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Project))
    .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
}

export async function getProject(id: string) {
  const snap = await getDoc(doc(db, "projects", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Project;
}

export async function updateProject(id: string, data: Partial<Project>) {
  await updateDoc(doc(db, "projects", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getProjectsByMember(uid: string): Promise<Project[]> {
  const q = query(projectsCol(), where("memberUids", "array-contains", uid));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Project))
    .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
}

export async function getProjectMembers(uids: string[]): Promise<AppUser[]> {
  if (!uids.length) return [];
  const profiles = await Promise.all(uids.map((uid) => getUser(uid)));
  return profiles.filter(Boolean) as AppUser[];
}

export async function addProjectMember(projectId: string, uid: string) {
  await updateDoc(doc(db, "projects", projectId), {
    memberUids: arrayUnion(uid),
    updatedAt:  serverTimestamp(),
  });
}

// ─── Project Events ───────────────────────────────────────────────────────────

export async function createProjectEvent(
  projectId: string,
  data: Omit<ProjectEvent, "id" | "projectId" | "createdAt">
) {
  const col = collection(db, "projects", projectId, "events");
  const ref = await addDoc(col, {
    ...data,
    projectId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getProjectEvents(projectId: string) {
  const col = collection(db, "projects", projectId, "events");
  const q = query(col, orderBy("scheduledAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProjectEvent));
}

export async function deleteProjectEvent(projectId: string, eventId: string) {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "projects", projectId, "events", eventId));
}

// ─── Invoices & Payments ──────────────────────────────────────────────────────

import type { Invoice, Payment, InvoiceStatus, PaymentMethod } from "@/types";

const invoicesCol = (projectId: string) =>
  collection(db, "projects", projectId, "invoices");

const paymentsCol = (projectId: string, invoiceId: string) =>
  collection(db, "projects", projectId, "invoices", invoiceId, "payments");

export async function getInvoices(projectId: string): Promise<Invoice[]> {
  const snap = await getDocs(query(invoicesCol(projectId), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice));
}

export async function createInvoice(
  projectId: string,
  data: Omit<Invoice, "id" | "projectId" | "paidAmount" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(invoicesCol(projectId), {
    ...data,
    projectId,
    paidAmount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateInvoice(projectId: string, invoiceId: string, data: Partial<Invoice>) {
  await updateDoc(doc(db, "projects", projectId, "invoices", invoiceId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getPayments(projectId: string, invoiceId: string): Promise<Payment[]> {
  const snap = await getDocs(query(paymentsCol(projectId, invoiceId), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
}

export async function recordPayment(
  projectId: string,
  invoiceId: string,
  data: { amount: number; method: PaymentMethod; note?: string; paidAt: import("firebase/firestore").Timestamp },
  currentPaidAmount: number,
  invoiceAmount: number
): Promise<void> {
  const newPaidAmount = Math.min(currentPaidAmount + data.amount, invoiceAmount);
  const newStatus: InvoiceStatus =
    newPaidAmount >= invoiceAmount ? "paid" : newPaidAmount > 0 ? "partial" : "sent";

  await addDoc(paymentsCol(projectId, invoiceId), {
    ...data,
    invoiceId,
    projectId,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "projects", projectId, "invoices", invoiceId), {
    paidAmount: newPaidAmount,
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}
