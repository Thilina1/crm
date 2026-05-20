import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, perPage, onChange }: Props) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * perPage + 1;
  const end   = Math.min(page * perPage, total);

  // Build a compact page-number window
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  const btn = (disabled: boolean, onClick: () => void, children: React.ReactNode) => (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid rgba(99,102,241,0.08)" }}>
      <p className="text-xs text-slate-400">{start}–{end} of {total}</p>
      <div className="flex items-center gap-1">
        {btn(page === 1, () => onChange(page - 1), <ChevronLeft className="w-3.5 h-3.5" />)}
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`d${i}`} className="w-8 text-center text-xs text-slate-300">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                p === page
                  ? "text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
              style={p === page ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" } : undefined}
            >
              {p}
            </button>
          )
        )}
        {btn(page === totalPages, () => onChange(page + 1), <ChevronRight className="w-3.5 h-3.5" />)}
      </div>
    </div>
  );
}
