import { useState, useEffect, useCallback, useRef } from "react";

/* ─── DATA ─── */
const STANDS = [
  { id: "tir", label: "Tir au but", emoji: "⚽", capacity: 3 },
  { id: "resto", label: "Restauration", emoji: "🍔", capacity: 4 },
  { id: "maq", label: "Maquillage", emoji: "🎨", capacity: 2 },
  { id: "peche", label: "Pêche canards", emoji: "🦆", capacity: 2 },
  { id: "tom", label: "Tombola", emoji: "🎰", capacity: 3 },
  { id: "buv", label: "Buvette", emoji: "🍺", capacity: 4 },
];
const TIMESLOTS = [
  { id: "10h", label: "10h" },
  { id: "11h", label: "11h" },
  { id: "14h", label: "14h" },
  { id: "15h", label: "15h" },
];
const MOCK = [
  { name: "Marie Dupont", email: "marie@ex.fr", phone: "06 12 34 56 78", stand: "tir", slot: "10h" },
  { name: "Marie Dupont", email: "marie@ex.fr", phone: "06 12 34 56 78", stand: "buv", slot: "11h" },
  { name: "Pierre Martin", email: "pierre@ex.fr", phone: "", stand: "tir", slot: "10h" },
  { name: "Pierre Martin", email: "pierre@ex.fr", phone: "", stand: "resto", slot: "14h" },
  { name: "Sophie Bernard", email: "sophie@ex.fr", phone: "07 11 22 33 44", stand: "resto", slot: "10h" },
  { name: "Sophie Bernard", email: "sophie@ex.fr", phone: "07 11 22 33 44", stand: "resto", slot: "11h" },
  { name: "Sophie Bernard", email: "sophie@ex.fr", phone: "07 11 22 33 44", stand: "maq", slot: "15h" },
  { name: "Lucas Petit", email: "lucas@ex.fr", phone: "", stand: "maq", slot: "10h" },
  { name: "Lucas Petit", email: "lucas@ex.fr", phone: "", stand: "peche", slot: "14h" },
  { name: "Emma Leroy", email: "emma@ex.fr", phone: "06 99 88 77 66", stand: "tir", slot: "10h" },
  { name: "Emma Leroy", email: "emma@ex.fr", phone: "06 99 88 77 66", stand: "resto", slot: "10h" },
  { name: "Emma Leroy", email: "emma@ex.fr", phone: "06 99 88 77 66", stand: "buv", slot: "14h" },
  { name: "Julie Renard", email: "julie@ex.fr", phone: "", stand: "resto", slot: "10h" },
  { name: "Julie Renard", email: "julie@ex.fr", phone: "", stand: "resto", slot: "11h" },
  { name: "Tom Vasseur", email: "tom@ex.fr", phone: "", stand: "peche", slot: "10h" },
  { name: "Tom Vasseur", email: "tom@ex.fr", phone: "", stand: "tom", slot: "11h" },
  { name: "Léa Fontaine", email: "lea@ex.fr", phone: "", stand: "maq", slot: "10h" },
  { name: "Léa Fontaine", email: "lea@ex.fr", phone: "", stand: "buv", slot: "15h" },
  { name: "Hugo Chevalier", email: "hugo@ex.fr", phone: "", stand: "resto", slot: "10h" },
  { name: "Hugo Chevalier", email: "hugo@ex.fr", phone: "", stand: "tom", slot: "15h" },
];

const ME_DEFAULT = { email: "moi@ex.fr" };
const MAX_INS = 4;

/* ─── RESPONSIVE HOOK ─── */
function useResponsive() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return { mobile: w <= 520, tablet: w <= 768, width: w };
}

/* ─── HELPERS ─── */
const getList = (ins, sid, tid) => ins.filter(i => i.stand === sid && i.slot === tid);
const isMine = (ins, email, sid, tid) => ins.some(i => i.email === email && i.stand === sid && i.slot === tid);
const hasConflict = (ins, email, tid) => ins.some(i => i.email === email && i.slot === tid);
const myTotal = (ins, email) => ins.filter(i => i.email === email).length;

const C = {
  other:    { bg: "#E8E5E0", text: "#57534E" },
  me:       { bg: "#3B82F6", text: "#fff", light: "#DBEAFE", glow: "rgba(59,130,246,.18)" },
  free:     { border: "#C8C5BD" },
  joinable: { border: "#93C5FD", bg: "#EFF6FF", text: "#3B82F6" },
  conflict: { border: "#E5E7EB", text: "#D1D5DB" },
};

/* ─── PERSON BAR ─── */
function PersonBar({ person, isMe, onToggle, standId, slotId, activeTooltip, setActiveTooltip, mobile }) {
  const barId = `${standId}-${slotId}-${person.email}`;
  const showing = activeTooltip === barId;
  const handleTap = (e) => {
    e.stopPropagation();
    if (isMe) onToggle(standId, slotId);
    else setActiveTooltip(showing ? null : barId);
  };
  const h = mobile ? 20 : 22;
  return (
    <div style={{ position: "relative" }}>
      {showing && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 5px)",
          left: "50%", transform: "translateX(-50%)",
          background: "#1C1917", color: "#fff",
          borderRadius: 7, padding: "4px 10px",
          fontSize: 11, fontWeight: 700,
          whiteSpace: "nowrap", zIndex: 50,
          boxShadow: "0 4px 12px rgba(0,0,0,.2)",
          pointerEvents: "none", animation: "tipIn .12s ease",
        }}>
          {person.name}
          <div style={{
            position: "absolute", top: "100%", left: "50%",
            transform: "translateX(-50%)", width: 0, height: 0,
            borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
            borderTop: "5px solid #1C1917"
          }} />
        </div>
      )}
      <div onClick={handleTap}
        onMouseEnter={() => { if (!isMe) setActiveTooltip(barId); }}
        onMouseLeave={() => { if (!isMe && showing) setActiveTooltip(null); }}
        style={{
          height: h, borderRadius: mobile ? 4 : 5,
          background: isMe ? C.me.bg : C.other.bg,
          display: "flex", alignItems: "center",
          padding: mobile ? "0 4px" : "0 6px", gap: 3,
          cursor: "pointer", transition: "all .15s", overflow: "hidden",
          boxShadow: isMe ? `0 0 0 1.5px ${C.me.bg}, 0 2px 6px ${C.me.glow}` : "none",
        }}>
        <span style={{
          fontSize: mobile ? 8.5 : 9.5, fontWeight: 700,
          color: isMe ? C.me.text : C.other.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1
        }}>{person.name}</span>
        {isMe && <span style={{ fontSize: 7, color: "rgba(255,255,255,.6)", flexShrink: 0 }}>✕</span>}
      </div>
    </div>
  );
}

/* ─── FORM ─── */
function IdentityForm({ form, setForm, errors, onEmailBlur, editingHint, mobile }) {
  const inputStyle = {
    width: "100%", padding: mobile ? "7px 10px" : "8px 12px",
    borderRadius: mobile ? 8 : 9,
    border: "1.5px solid #E7E5E0", fontFamily: "'Nunito', sans-serif",
    fontSize: mobile ? 13 : 13, color: "#1C1917", background: "#fff",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle = {
    display: "block", fontWeight: 700, fontSize: mobile ? 9 : 10,
    color: "#78716C", textTransform: "uppercase",
    letterSpacing: "0.04em", marginBottom: 2,
  };
  return (
    <div style={{
      background: "#fff", borderRadius: mobile ? 12 : 14,
      border: "1px solid #E7E5E0",
      padding: mobile ? "10px 12px" : "12px 16px",
      marginBottom: mobile ? 8 : 12,
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: mobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr",
        gap: mobile ? "8px 8px" : "8px 12px"
      }}>
        <div>
          <label style={labelStyle}>Prénom *</label>
          <input value={form.firstName} placeholder="Marie"
            onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
            style={{ ...inputStyle, borderColor: errors.firstName ? "#FCA5A5" : "#E7E5E0" }} />
        </div>
        <div>
          <label style={labelStyle}>Nom *</label>
          <input value={form.lastName} placeholder="Dupont"
            onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
            style={{ ...inputStyle, borderColor: errors.lastName ? "#FCA5A5" : "#E7E5E0" }} />
        </div>
        <div>
          <label style={labelStyle}>Email *</label>
          <input value={form.email} placeholder="marie@exemple.fr" type="email"
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            onBlur={onEmailBlur}
            style={{ ...inputStyle, borderColor: errors.email ? "#FCA5A5" : "#E7E5E0" }} />
        </div>
        <div>
          <label style={labelStyle}>Téléphone</label>
          <input value={form.phone} placeholder="06 12 34 56 78" type="tel"
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            style={inputStyle} />
        </div>
      </div>
      {editingHint && (
        <p style={{ color: "#059669", fontSize: 11, fontWeight: 700, marginTop: 6, marginBottom: 0 }}>
          ✏️ Inscriptions retrouvées — modifiez et re-soumettez.
        </p>
      )}
      {Object.values(errors).some(Boolean) && (
        <p style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, marginTop: 6, marginBottom: 0 }}>
          Veuillez remplir les champs obligatoires.
        </p>
      )}
    </div>
  );
}

/* ─── RECAP ─── */
function MyRecap({ inscriptions, email, onToggle, mobile }) {
  const mine = inscriptions.filter(i => i.email === email);
  if (!mine.length) return null;
  return (
    <div style={{
      marginTop: mobile ? 8 : 14,
      background: C.me.light, borderRadius: mobile ? 10 : 12,
      border: `1.5px solid ${C.me.bg}44`, padding: mobile ? "10px 10px" : "12px 14px"
    }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: C.me.bg, marginBottom: 6 }}>📋 Mes inscriptions</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {mine.map((ins, idx) => {
          const stand = STANDS.find(s => s.id === ins.stand);
          const slot = TIMESLOTS.find(t => t.id === ins.slot);
          return (
            <div key={idx} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: mobile ? "3px 8px" : "4px 10px", borderRadius: 99,
              background: C.me.bg, color: "#fff",
              fontSize: mobile ? 10 : 11, fontWeight: 700,
            }}>
              {stand.emoji} {mobile ? "" : stand.label + " "}
              <span style={{
                background: "rgba(255,255,255,.25)", borderRadius: 99,
                padding: "1px 6px", fontSize: 10, fontWeight: 800
              }}>{slot.label}</span>
              <span onClick={() => onToggle(ins.stand, ins.slot)}
                style={{ cursor: "pointer", fontSize: 12, opacity: 0.7, marginLeft: 1 }}>✕</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── TOAST ─── */
function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
  const isErr = message.includes("❌");
  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      background: isErr ? "#FEF2F2" : "#F0FDF4",
      color: isErr ? "#991B1B" : "#065F46",
      border: `1.5px solid ${isErr ? "#FCA5A5" : "#6EE7B7"}`,
      borderRadius: 12, padding: "10px 20px",
      fontWeight: 700, fontSize: 13, maxWidth: "90vw",
      boxShadow: "0 8px 30px rgba(0,0,0,.12)",
      zIndex: 999, animation: "slideUp .3s ease",
      fontFamily: "'Nunito', sans-serif", textAlign: "center"
    }}>{message}</div>
  );
}

/* ─── EMAIL PREVIEW (simulated) ─── */
function EmailPreview({ form, inscriptions, onClose }) {
  const mine = inscriptions.filter(i => i.email === form.email);
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 16, animation: "fadeIn .2s ease",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, maxWidth: 440, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,.2)", overflow: "hidden",
        fontFamily: "'Nunito', sans-serif",
      }}>
        <div style={{
          background: "linear-gradient(135deg, #EA580C, #F97316)",
          padding: "16px 20px", color: "#fff"
        }}>
          <div style={{ fontSize: 11, opacity: .7, marginBottom: 2 }}>De : kermesse@ecole-voltaire.fr</div>
          <div style={{ fontSize: 11, opacity: .7, marginBottom: 4 }}>À : {form.email}</div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>🎪 Confirmation d'inscription — Kermesse</div>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <p style={{ fontSize: 14, margin: "0 0 12px", color: "#1C1917" }}>
            Bonjour <strong>{form.firstName}</strong>,
          </p>
          <p style={{ fontSize: 13, margin: "0 0 14px", color: "#57534E", lineHeight: 1.5 }}>
            Vos inscriptions pour la kermesse ont bien été enregistrées. Voici le récapitulatif :
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
            {mine.map((ins, i) => {
              const stand = STANDS.find(s => s.id === ins.stand);
              const slot = TIMESLOTS.find(t => t.id === ins.slot);
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", borderRadius: 8,
                  background: "#F8FAFC", border: "1px solid #E7E5E0"
                }}>
                  <span style={{ fontSize: 20 }}>{stand.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{stand.label}</div>
                    <div style={{ fontSize: 12, color: "#78716C" }}>{slot.label}–{parseInt(slot.label) + 1}h</div>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: "#A8A29E", margin: "0 0 4px", lineHeight: 1.4 }}>
            Vous pouvez modifier vos inscriptions à tout moment en retournant sur le formulaire avec votre adresse email.
          </p>
        </div>
        <div style={{
          padding: "12px 20px", borderTop: "1px solid #E7E5E0",
          textAlign: "right"
        }}>
          <button onClick={onClose} style={{
            padding: "8px 20px", borderRadius: 9, border: "none",
            background: "#F97316", color: "#fff", fontWeight: 800,
            fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif"
          }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

/* ─── MATRIX ─── */
function Matrix({ inscriptions, onToggle, email, mobile }) {
  const mc = myTotal(inscriptions, email);
  const [activeTooltip, setActiveTooltip] = useState(null);

  useEffect(() => {
    if (!activeTooltip) return;
    const close = () => setActiveTooltip(null);
    const timer = setTimeout(() => document.addEventListener("click", close, { once: true }), 10);
    return () => { clearTimeout(timer); document.removeEventListener("click", close); };
  }, [activeTooltip]);

  const barH = mobile ? 20 : 22;
  const gap = 2;

  return (
    <div style={{
      background: "#fff", borderRadius: mobile ? 10 : 14,
      border: "1px solid #E7E5E0", overflow: "visible"
    }}>
      <table style={{
        width: "100%", borderCollapse: "collapse",
        fontFamily: "'Nunito', sans-serif", tableLayout: "fixed"
      }}>
        <colgroup>
          <col style={{ width: mobile ? 44 : "15%" }} />
          {TIMESLOTS.map(t => <col key={t.id} />)}
        </colgroup>
        <thead>
          <tr style={{ background: "#FFF7ED" }}>
            <th style={{
              padding: mobile ? "6px 2px" : "8px 4px",
              textAlign: "center", fontWeight: 800,
              borderBottom: "1.5px solid #E7E5E0",
              fontSize: mobile ? 9 : 10, color: "#78716C"
            }}><span style={{ fontSize: mobile ? 10 : 11 }}>🏪</span></th>
            {TIMESLOTS.map(ts => (
              <th key={ts.id} style={{
                padding: mobile ? "6px 1px" : "8px 2px",
                textAlign: "center", fontWeight: 800,
                borderBottom: "1.5px solid #E7E5E0",
                borderLeft: "1px solid #E7E5E0",
                fontSize: mobile ? 12 : 14, color: "#C2410C",
                letterSpacing: "-0.02em"
              }}>{ts.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STANDS.map((stand, si) => (
            <tr key={stand.id} style={{
              borderBottom: "1px solid #E7E5E0",
              background: si % 2 === 0 ? "#fff" : "#FAFAF7"
            }}>
              <td style={{
                padding: mobile ? "4px 2px" : "6px 3px",
                borderRight: "1px solid #E7E5E0",
                textAlign: "center", verticalAlign: "middle"
              }}>
                <div style={{ fontSize: mobile ? 16 : 20, lineHeight: 1 }}>{stand.emoji}</div>
                <div style={{
                  fontSize: mobile ? 8 : 9, fontWeight: 800, color: "#44403C",
                  lineHeight: 1.15, marginTop: 1,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                }}>{stand.label}</div>
                <div style={{
                  fontSize: mobile ? 7 : 8, color: "#A8A29E", fontWeight: 700, marginTop: 1
                }}>{stand.capacity}p.</div>
              </td>
              {TIMESLOTS.map(ts => {
                const list = getList(inscriptions, stand.id, ts.id);
                const mine = isMine(inscriptions, email, stand.id, ts.id);
                const conflict = !mine && hasConflict(inscriptions, email, ts.id);
                const full = list.length >= stand.capacity;
                const atMax = !mine && mc >= MAX_INS;
                const canJoin = !mine && !full && !conflict && !atMax;
                const empty = stand.capacity - list.length;

                return (
                  <td key={ts.id} style={{
                    padding: mobile ? "3px 2px" : "4px 3px",
                    borderLeft: "1px solid #E7E5E0",
                    verticalAlign: "top",
                    background: mine ? C.me.glow : "transparent",
                    transition: "background .25s",
                    overflow: "visible", position: "relative",
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap }}>
                      {list.map((p) => (
                        <PersonBar key={p.email} person={p}
                          isMe={p.email === email}
                          onToggle={onToggle} standId={stand.id} slotId={ts.id}
                          activeTooltip={activeTooltip} setActiveTooltip={setActiveTooltip}
                          mobile={mobile} />
                      ))}
                      {Array.from({ length: empty }).map((_, i) => {
                        const isFirst = i === 0;
                        const clickable = canJoin && isFirst;
                        return (
                          <div key={`e${i}`}
                            onClick={clickable ? () => onToggle(stand.id, ts.id) : undefined}
                            style={{
                              height: barH, borderRadius: mobile ? 4 : 5,
                              border: clickable
                                ? `1.5px dashed ${C.joinable.border}`
                                : conflict && isFirst
                                  ? `1.5px dashed ${C.conflict.border}`
                                  : `1.5px dashed ${C.free.border}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: clickable ? "pointer" : "default",
                              transition: "all .2s",
                              opacity: clickable ? 1 : 0.4,
                              background: clickable ? C.joinable.bg : "transparent",
                            }}>
                            <span style={{
                              fontSize: mobile ? 8 : 9, fontWeight: 700,
                              color: clickable ? C.joinable.text : C.conflict.text,
                            }}>
                              {clickable ? (mobile ? "+" : "+ Vous") : conflict && isFirst ? (mobile ? "—" : "conflit") : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── MAIN ─── */
export default function App() {
  const { mobile } = useResponsive();
  const [inscriptions, setInscriptions] = useState(MOCK);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const showToast = useCallback((msg) => setToast(msg), []);
  const currentEmail = form.email.trim().toLowerCase();

  // Email blur: check if existing
  const handleEmailBlur = useCallback(() => {
    if (!currentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) {
      setEditingId(null);
      return;
    }
    const existing = inscriptions.find(i => i.email.toLowerCase() === currentEmail);
    if (existing) {
      const parts = existing.name.split(" ");
      setForm(f => ({
        ...f,
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ") || "",
        phone: existing.phone || f.phone,
      }));
      setEditingId(currentEmail);
      setErrors({});
    } else {
      setEditingId(null);
    }
  }, [currentEmail, inscriptions]);

  const handleToggle = useCallback((standId, slotId) => {
    if (!currentEmail) {
      showToast("❌ Renseignez votre email d'abord");
      return;
    }
    setInscriptions(prev => {
      const mine = prev.some(i => i.email === currentEmail && i.stand === standId && i.slot === slotId);
      if (mine) {
        showToast(`❌ Désinscription — ${STANDS.find(s => s.id === standId).emoji} ${TIMESLOTS.find(t => t.id === slotId).label}`);
        return prev.filter(i => !(i.email === currentEmail && i.stand === standId && i.slot === slotId));
      }
      const stand = STANDS.find(s => s.id === standId);
      if (getList(prev, standId, slotId).length >= stand.capacity) { showToast("❌ Complet"); return prev; }
      if (prev.some(i => i.email === currentEmail && i.slot === slotId)) { showToast("❌ Conflit horaire"); return prev; }
      if (myTotal(prev, currentEmail) >= MAX_INS) { showToast(`❌ Max. ${MAX_INS} inscriptions`); return prev; }
      const name = `${form.firstName} ${form.lastName}`.trim() || "Vous";
      showToast(`✅ ${stand.emoji} ${stand.label} · ${TIMESLOTS.find(t => t.id === slotId).label}`);
      return [...prev, { name, email: currentEmail, phone: form.phone, stand: standId, slot: slotId }];
    });
  }, [currentEmail, form, showToast]);

  const mc = myTotal(inscriptions, currentEmail);

  const handleSubmit = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = true;
    if (!form.lastName.trim()) e.lastName = true;
    if (!currentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) e.email = true;
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    if (mc === 0) { showToast("❌ Sélectionnez au moins un créneau"); return; }
    // Update all my inscriptions with current name
    const name = `${form.firstName.trim()} ${form.lastName.trim()}`;
    setInscriptions(prev => prev.map(i =>
      i.email === currentEmail ? { ...i, name, phone: form.phone } : i
    ));
    setShowEmail(true);
  };

  if (submitted) {
    return (
      <div style={{
        fontFamily: "'Nunito', sans-serif", color: "#1C1917",
        maxWidth: 900, margin: "0 auto", padding: "0 8px 60px",
      }}>
        <div style={{
          background: "linear-gradient(135deg, #EA580C, #F97316, #FB923C)",
          borderRadius: "0 0 18px 18px", padding: "16px 18px 14px",
          marginBottom: 12, boxShadow: "0 6px 28px rgba(249,115,22,.18)"
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>
            🎪 Kermesse de l'école Voltaire
          </h1>
        </div>
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#F97316", marginBottom: 6 }}>Merci !</h2>
          <p style={{ color: "#78716C", marginBottom: 6, fontSize: 14 }}>
            Vos {mc} inscription{mc > 1 ? "s" : ""} {mc > 1 ? "ont" : "a"} bien été enregistrée{mc > 1 ? "s" : ""}.
          </p>
          <p style={{ color: "#A8A29E", marginBottom: 20, fontSize: 12 }}>
            Un email de confirmation a été envoyé à <strong style={{ color: "#57534E" }}>{currentEmail}</strong>
          </p>
          <button onClick={() => {
            setSubmitted(false);
            setForm({ firstName: "", lastName: "", email: "", phone: "" });
            setErrors({});
            setEditingId(null);
          }} style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: "#F97316", color: "#fff", fontWeight: 800,
            fontSize: 14, cursor: "pointer", fontFamily: "'Nunito', sans-serif"
          }}>Nouvelle inscription</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Nunito', sans-serif", color: "#1C1917",
      maxWidth: 900, margin: "0 auto", padding: mobile ? "0 4px 80px" : "0 8px 60px",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #EA580C, #F97316, #FB923C)",
        borderRadius: "0 0 18px 18px",
        padding: mobile ? "12px 14px 10px" : "16px 18px 14px",
        marginBottom: mobile ? 8 : 12,
        boxShadow: "0 6px 28px rgba(249,115,22,.18)"
      }}>
        <h1 style={{ fontSize: mobile ? 16 : 18, fontWeight: 800, color: "#fff", margin: 0 }}>
          🎪 Kermesse de l'école Voltaire
        </h1>
        <p style={{ fontSize: mobile ? 11 : 12, color: "rgba(255,255,255,.78)", margin: "3px 0 0" }}>
          Inscrivez-vous aux stands — cliquez sur un emplacement libre
        </p>
      </div>

      <IdentityForm form={form} setForm={setForm} errors={errors}
        onEmailBlur={handleEmailBlur} editingHint={!!editingId} mobile={mobile} />

      <Matrix inscriptions={inscriptions} onToggle={handleToggle}
        email={currentEmail} mobile={mobile} />

      <MyRecap inscriptions={inscriptions} email={currentEmail}
        onToggle={handleToggle} mobile={mobile} />

      <button onClick={handleSubmit} style={{
        width: "100%", marginTop: mobile ? 10 : 14,
        padding: mobile ? "12px" : "13px",
        borderRadius: mobile ? 10 : 12, border: "none", cursor: "pointer",
        background: mc > 0 ? C.me.bg : "#D1D5DB",
        color: "#fff", fontWeight: 800, fontSize: mobile ? 14 : 15,
        fontFamily: "'Nunito', sans-serif",
        boxShadow: mc > 0 ? `0 4px 16px ${C.me.glow}` : "none",
        transition: "all .25s", opacity: mc > 0 ? 1 : 0.7,
      }}>
        {mc > 0
          ? `✓ Valider mes ${mc} inscription${mc > 1 ? "s" : ""}`
          : "Sélectionnez des créneaux"}
      </button>

      {showEmail && (
        <EmailPreview form={form} inscriptions={inscriptions}
          onClose={() => { setShowEmail(false); setSubmitted(true); }} />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes tipIn {
          from { opacity: 0; transform: translateX(-50%) translateY(3px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
