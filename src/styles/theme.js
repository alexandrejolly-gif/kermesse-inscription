import { useState, useEffect, createElement } from "react";

/* ─── RESPONSIVE HOOK ─── */
export function useResponsive() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return { mobile: w <= 520, tablet: w <= 768, width: w };
}

/* ─── THEME TOKENS ─── */
export const T = {
  bg: "#FFFBF0",
  surface: "#FFFFFF",
  surfaceAlt: "#FAFAF7",
  border: "#E7E5E0",
  text: "#1C1917",
  muted: "#78716C",
  hint: "#A8A29E",
  primary: "#F97316",
  primaryDk: "#C2410C",
  primaryBg: "#FFF7ED",
  font: "'Nunito', sans-serif",
};

/* ─── MATRIX COLORS ─── */
export const C = {
  other:    { bg: "#E8E5E0", text: "#57534E" },
  me:       { bg: "#3B82F6", text: "#fff", light: "#DBEAFE", border: "#3B82F6", glow: "rgba(59,130,246,.18)" },
  free:     { border: "#C8C5BD" },
  joinable: { border: "#93C5FD", bg: "#EFF6FF", text: "#3B82F6" },
  conflict: { border: "#E5E7EB", text: "#D1D5DB" },
};

/* ─── STYLE HELPERS ─── */
export const card = (mobile) => ({
  background: T.surface,
  borderRadius: mobile ? 12 : 14,
  border: `1px solid ${T.border}`,
  padding: mobile ? "10px 12px" : "12px 16px",
});

export const inputBase = (mobile) => ({
  width: "100%",
  padding: mobile ? "7px 10px" : "8px 12px",
  borderRadius: mobile ? 8 : 9,
  border: `1.5px solid ${T.border}`,
  fontFamily: T.font,
  fontSize: 13,
  color: T.text,
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
});

export const lbl = (mobile) => ({
  display: "block",
  fontWeight: 700,
  fontSize: mobile ? 9 : 10,
  color: T.muted,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 2,
});

export const errMsg = {
  color: "#DC2626",
  fontSize: 11,
  fontWeight: 700,
  marginTop: 6,
  marginBottom: 0,
};

export const btn = (active, mobile) => ({
  width: "100%",
  marginTop: mobile ? 10 : 14,
  padding: mobile ? "12px" : "13px",
  borderRadius: mobile ? 10 : 12,
  border: "none",
  cursor: "pointer",
  background: active ? C.me.bg : "#D1D5DB",
  color: "#fff",
  fontWeight: 800,
  fontSize: mobile ? 14 : 15,
  fontFamily: T.font,
  boxShadow: active ? `0 4px 16px ${C.me.glow}` : "none",
  transition: "all .25s",
  opacity: active ? 1 : 0.7,
});

export const iconBtn = (mobile) => ({
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: mobile ? 14 : 16,
  padding: 2,
  lineHeight: 1,
});

/* ─── VALIDATION ─── */
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isPhone = (v) => {
  const cleaned = v.replace(/\s/g, ''); // Enlever les espaces
  return /^0[1-9]\d{8}$/.test(cleaned); // Format: 0X suivi de 8 chiffres (total 10)
};

/* ─── UID ─── */
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* ─── ARRAY MOVE ─── */
export function move(arr, from, to) {
  const a = [...arr];
  const [item] = a.splice(from, 1);
  a.splice(to, 0, item);
  return a;
}

/* ─── MARKDOWN PARSER ─── */
export function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      elements.push(createElement('br', { key: i }));
      continue;
    }

    // Parse inline elements: **bold**, *italic*, [text](url)
    const parts = [];
    let remaining = line;
    let key = 0;

    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\))/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(remaining)) !== null) {
      // Text before match
      if (match.index > lastIndex) {
        parts.push(remaining.slice(lastIndex, match.index));
      }

      if (match[2]) {
        // **bold**
        parts.push(createElement('strong', {
          key: `${i}-${key++}`,
          style: { fontWeight: 800 }
        }, match[2]));
      } else if (match[3]) {
        // *italic*
        parts.push(createElement('em', { key: `${i}-${key++}` }, match[3]));
      } else if (match[4] && match[5]) {
        // [text](url)
        parts.push(
          createElement('a', {
            key: `${i}-${key++}`,
            href: match[5],
            target: "_blank",
            rel: "noopener noreferrer",
            style: { color: T.primary, fontWeight: 700, textDecoration: "underline" }
          }, match[4])
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Remaining text after last match
    if (lastIndex < remaining.length) {
      parts.push(remaining.slice(lastIndex));
    }

    elements.push(
      createElement('p', { key: i, style: { margin: "0 0 4px" } },
        parts.length > 0 ? parts : line
      )
    );
  }

  return createElement('div', null, ...elements);
}

/* ─── CSV EXPORT ─── */
export function buildCSV(stands, timeslots, inscriptions) {
  const BOM = "\uFEFF";
  const sep = ";";

  const slotCols = timeslots.map((t) => t.label);
  const header = ["Nom", "Email", "Téléphone", "Date inscription", ...slotCols].join(sep);

  // Group inscriptions by email
  const byEmail = {};
  for (const ins of inscriptions) {
    if (!byEmail[ins.email]) byEmail[ins.email] = [];
    byEmail[ins.email].push(ins);
  }

  const rows = Object.entries(byEmail).map(([email, list]) => {
    const first = list[0];
    const name = first.name || "";
    const phone = first.phone || "";
    const date = first.created_at
      ? new Date(first.created_at).toLocaleDateString("fr-FR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : "";

    const slotValues = timeslots.map((t) => {
      const match = list.find((i) => i.slot_id === t.id);
      if (!match) return "";
      const stand = stands.find((s) => s.id === match.stand_id);
      return stand ? `${stand.emoji} ${stand.label}` : "";
    });

    return [name, email, phone, date, ...slotValues].join(sep);
  });

  return BOM + header + "\n" + rows.join("\n");
}
