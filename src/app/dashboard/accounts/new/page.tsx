"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAccount, ACCOUNT_TYPE_LABELS } from "@/lib/firestore";
import type { AccountType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Building2, Phone, Mail, Globe, MapPin, Briefcase, FileText } from "lucide-react";

const glass = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.8)",
  boxShadow: "0 4px 32px rgba(99,102,241,0.06), 0 1px 4px rgba(0,0,0,0.04)",
} as React.CSSProperties;

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={glass}>
      <div className="px-5 py-4 flex items-center gap-2.5"
        style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(99,102,241,0.08)" }}>
          <Icon className="w-3.5 h-3.5 text-indigo-500" />
        </div>
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
        {label}{required && <span className="text-indigo-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function NewAccountPage() {
  const router  = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name:     "",
    type:     "customer" as AccountType,
    phone:    "",
    email:    "",
    website:  "",
    industry: "",
    address:  "",
    notes:    "",
  });

  function set(field: string, value: string | null) {
    setForm((f) => ({ ...f, [field]: value ?? "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Account name is required"); return; }

    setSaving(true);
    try {
      const id = await createAccount({
        name:        form.name.trim(),
        type:        form.type,
        phone:       form.phone || undefined,
        email:       form.email || undefined,
        website:     form.website || undefined,
        industry:    form.industry || undefined,
        address:     form.address || undefined,
        notes:       form.notes || undefined,
        tags:        [],
        customFields: {},
        isArchived:  false,
      });
      toast.success("Account created");
      router.push(`/dashboard/accounts/${id}`);
    } catch {
      toast.error("Failed to create account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors font-medium mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to accounts
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-slate-900">New Account</h1>
        <p className="text-sm text-slate-400 mt-1">Add a customer, prospect, partner or vendor.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identity */}
        <Section title="Account identity" icon={Building2}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Account name" required>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder='e.g. "Acme Corp"'
                  className="h-10 bg-white/60 border-indigo-100 focus:border-indigo-300"
                />
              </Field>
            </div>

            <Field label="Account type" required>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger className="h-10 bg-white/60 border-indigo-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Industry">
              <div className="relative">
                <Briefcase className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}
                  placeholder='e.g. "Solar energy"'
                  className="pl-9 h-10 bg-white/60 border-indigo-100 focus:border-indigo-300"
                />
              </div>
            </Field>
          </div>
        </Section>

        {/* Contact */}
        <Section title="Contact information" icon={Phone}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone">
              <div className="relative">
                <Phone className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="pl-9 h-10 bg-white/60 border-indigo-100 focus:border-indigo-300"
                />
              </div>
            </Field>

            <Field label="Email">
              <div className="relative">
                <Mail className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="hello@company.com"
                  className="pl-9 h-10 bg-white/60 border-indigo-100 focus:border-indigo-300"
                />
              </div>
            </Field>

            <Field label="Website">
              <div className="relative">
                <Globe className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://company.com"
                  className="pl-9 h-10 bg-white/60 border-indigo-100 focus:border-indigo-300"
                />
              </div>
            </Field>

            <Field label="Address">
              <div className="relative">
                <MapPin className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="123 Main St, City, Country"
                  className="pl-9 h-10 bg-white/60 border-indigo-100 focus:border-indigo-300"
                />
              </div>
            </Field>
          </div>
        </Section>

        {/* Notes */}
        <Section title="Notes" icon={FileText}>
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="bg-white/60 border-indigo-100 focus:border-indigo-300 resize-none text-sm"
            placeholder="Anything worth noting about this account…"
          />
        </Section>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            disabled={saving}
            className="h-10 px-6 text-white font-semibold rounded-xl shadow-md shadow-indigo-400/20"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none" }}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating…
              </span>
            ) : "Create account"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="h-10 border-slate-200 text-slate-600 rounded-xl"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
