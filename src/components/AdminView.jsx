import { useState, useEffect } from "react";
import { T, inputBase, lbl, btn, uid, move, buildCSV, useResponsive, card } from "../styles/theme";
import EditableItem from "./EditableItem";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const adminTabs = [
  { id: "stands", icon: "🏪", label: "Stands" },
  { id: "slots", icon: "⏰", label: "Créneaux" },
  { id: "general", icon: "⚙️", label: "Général" },
  { id: "spectacles", icon: "🎭", label: "Spectacles" },
  { id: "inscriptions", icon: "👥", label: "Inscriptions" },
];

// Créneaux possibles pour les stands (8h à 19h, 1h)
const STAND_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 8;
  return { id: `${h}h`, label: `${h}h` };
});

// Créneaux possibles pour la sécurisation (8h à 19h30, 30min)
const SECU_SLOTS = [];
for (let h = 8; h < 20; h++) {
  SECU_SLOTS.push({ id: `${h}h`, label: `${h}h` });
  if (h < 20) SECU_SLOTS.push({ id: `${h}h30`, label: `${h}h30` });
}

export default function AdminView({ cfg, stands, timeslots, spectacles, inscriptions, setCfg, setStands, setTimeslots, setSpectacles, showToast, onRefresh, onRefreshSpectacles }) {
  const { mobile } = useResponsive();
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [tab, setTab] = useState("stands");
  const [saving, setSaving] = useState(false);

  // Local editable copies
  const [localStands, setLocalStands] = useState(stands);
  const [localSlots, setLocalSlots] = useState(timeslots);
  const [localSpectacles, setLocalSpectacles] = useState(spectacles);
  const [localCfg, setLocalCfg] = useState(cfg);

  // Créneaux actifs (pour la grille de toggle)
  const [activeStandSlots, setActiveStandSlots] = useState(new Set());
  const [activeSecuSlots, setActiveSecuSlots] = useState(new Set());

  // Sync when props change
  useEffect(() => {
    setLocalStands(stands);
    setLocalSlots(timeslots);
    setLocalSpectacles(spectacles);
    setLocalCfg(cfg);

    // Initialiser les créneaux actifs depuis timeslots
    const standSet = new Set();
    const secuSet = new Set();

    timeslots.forEach(slot => {
      if (slot.type === 'securite') {
        secuSet.add(slot.label);
      } else {
        standSet.add(slot.label);
      }
    });

    setActiveStandSlots(standSet);
    setActiveSecuSlots(secuSet);
  }, [stands, timeslots, spectacles, cfg]);

  // Auth
  if (!authed) {
    return (
      <div style={{ ...card(mobile), maxWidth: 360, margin: "0 auto" }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text, margin: "0 0 10px", fontFamily: T.font }}>
          🔐 Administration
        </h3>
        <label style={lbl(mobile)}>Mot de passe</label>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (pw === cfg.admin_password) setAuthed(true);
              else showToast("❌ Mot de passe incorrect");
            }
          }}
          style={{ ...inputBase(mobile), marginBottom: 10 }}
        />
        <button
          onClick={() => {
            if (pw === cfg.admin_password) setAuthed(true);
            else showToast("❌ Mot de passe incorrect");
          }}
          style={{
            ...btn(true, mobile),
            marginTop: 0,
            background: T.primary,
          }}
        >
          Accéder
        </button>
      </div>
    );
  }

  const insCount = inscriptions.length;

  // ─── Save stands + slots
  const saveStandsSlots = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/save-stands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stands: localStands.map((s, i) => ({ ...s, position: i })),
          timeslots: localSlots.map((t, i) => ({ ...t, position: i })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast("✅ Stands et créneaux enregistrés");
      onRefresh();
    } catch (err) {
      showToast("❌ Erreur : " + err.message);
    }
    setSaving(false);
  };

  // ─── Save config
  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localCfg),
      });
      if (!res.ok) throw new Error(await res.text());
      setCfg(localCfg);
      showToast("✅ Configuration enregistrée");
    } catch (err) {
      showToast("❌ Erreur : " + err.message);
    }
    setSaving(false);
  };

  // ─── Save spectacles
  const saveSpectacles = async () => {
    setSaving(true);
    try {
      // Tri automatique par heure
      const sorted = [...localSpectacles].sort((a, b) => {
        const toMin = (h) => {
          const match = h.match(/^(\d{1,2})h(\d{2})?$/);
          if (!match) return 999;
          return parseInt(match[1]) * 60 + (parseInt(match[2]) || 0);
        };
        return toMin(a.heure) - toMin(b.heure);
      });

      // Recalculer les positions
      sorted.forEach((s, i) => s.position = i);

      const res = await fetch("/api/save-spectacles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spectacles: sorted }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast("✅ Spectacles enregistrés");
      onRefreshSpectacles();
    } catch (err) {
      showToast("❌ Erreur : " + err.message);
    }
    setSaving(false);
  };

  // ─── Delete single inscription
  const deleteInscription = async (id) => {
    try {
      const res = await fetch(`/api/delete-inscription?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      showToast("✅ Inscription supprimée");
      onRefresh();
    } catch (err) {
      showToast("❌ Erreur : " + err.message);
    }
  };

  // ─── Reset all
  const resetAll = async () => {
    if (!confirm("Supprimer TOUTES les inscriptions ? Cette action est irréversible.")) return;
    try {
      const res = await fetch("/api/reset-inscriptions", { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      showToast("✅ Toutes les inscriptions supprimées");
      onRefresh();
    } catch (err) {
      showToast("❌ Erreur : " + err.message);
    }
  };

  // ─── Export CSV
  const exportCSV = () => {
    const csv = buildCSV(stands, timeslots, inscriptions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inscriptions-kermesse.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Export PDF (tout sur 1 page A4)
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    // Titre compact
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(cfg.title || "Kermesse", 14, 10);

    // Séparer les stands et créneaux par type
    const normalStands = stands.filter(s => s.type !== 'securite');
    const securiteStands = stands.filter(s => s.type === 'securite');
    const normalTimeslots = timeslots.filter(t => t.type !== 'securite');
    const securiteTimeslots = timeslots.filter(t => t.type === 'securite');

    let yPos = 16;

    // Tableau 1 : Stands de la kermesse (compact)
    if (normalStands.length > 0 && normalTimeslots.length > 0) {
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text("🎪 Stands de la kermesse", 14, yPos);
      yPos += 4;

      const headers = ["Stand", ...normalTimeslots.map(t => t.label)];
      const rows = normalStands.map(stand => {
        const row = [`${stand.emoji} ${stand.label}`];
        normalTimeslots.forEach(slot => {
          const inscs = inscriptions.filter(i => i.stand_id === stand.id && i.slot_id === slot.id);
          const names = inscs.map(i => i.name).join("\n");
          row.push(names || "");
        });
        return row;
      });

      autoTable(doc, {
        startY: yPos,
        head: [headers],
        body: rows,
        theme: "grid",
        styles: { fontSize: 6, cellPadding: 1, font: "helvetica", overflow: 'linebreak' },
        headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: "bold", fontSize: 7 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 30 } },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => { yPos = data.cursor.y + 6; }
      });
    }

    // Tableau 2 : Sécurisation (compact, pas de nouvelle page)
    if (securiteStands.length > 0 && securiteTimeslots.length > 0) {
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text("🔒 Sécurisation de l'accès au site", 14, yPos);
      yPos += 4;

      const headers = ["Stand", ...securiteTimeslots.map(t => t.label)];
      const rows = securiteStands.map(stand => {
        const row = [`${stand.emoji} ${stand.label}`];
        securiteTimeslots.forEach(slot => {
          const inscs = inscriptions.filter(i => i.stand_id === stand.id && i.slot_id === slot.id);
          const names = inscs.map(i => i.name).join("\n");
          row.push(names || "");
        });
        return row;
      });

      autoTable(doc, {
        startY: yPos,
        head: [headers],
        body: rows,
        theme: "grid",
        styles: { fontSize: 6, cellPadding: 1, font: "helvetica", overflow: 'linebreak' },
        headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: "bold", fontSize: 7 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 30 } },
        margin: { left: 14, right: 14 }
      });
    }

    // Sauvegarder le PDF
    doc.save(`inscriptions-${cfg.title?.replace(/\s+/g, '-') || 'kermesse'}.pdf`);
  };

  // ─── Group inscriptions by email
  const byEmail = {};
  for (const ins of inscriptions) {
    if (!byEmail[ins.email]) byEmail[ins.email] = [];
    byEmail[ins.email].push(ins);
  }

  const smallBtn = (color, bg) => ({
    padding: mobile ? "6px 12px" : "7px 14px",
    borderRadius: 8, border: "none", cursor: "pointer",
    background: bg, color, fontWeight: 700,
    fontSize: mobile ? 11 : 12, fontFamily: T.font,
  });

  return (
    <div>
      {/* Admin tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 12,
        overflowX: "auto", paddingBottom: 2,
      }}>
        {adminTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: mobile ? "6px 10px" : "7px 14px",
              borderRadius: 8, border: `1.5px solid ${T.border}`,
              cursor: "pointer", fontFamily: T.font,
              fontSize: mobile ? 11 : 12, fontWeight: tab === t.id ? 800 : 600,
              background: tab === t.id ? T.primaryBg : T.surface,
              color: tab === t.id ? T.primaryDk : T.muted,
              whiteSpace: "nowrap",
              transition: "all .15s",
            }}
          >
            {t.icon} {t.label}{t.id === "inscriptions" ? ` (${insCount})` : ""}
          </button>
        ))}
      </div>

      {/* ─── STANDS TAB ─── */}
      {tab === "stands" && (
        <div style={card(mobile)}>
          <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 10px", fontFamily: T.font }}>🏪 Stands</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {localStands.map((s, i) => (
              <EditableItem
                key={s.id}
                item={s}
                fields={[
                  { key: "emoji", placeholder: "🎯", width: 44, center: true },
                  { key: "label", placeholder: "Nom du stand", flex: 1 },
                  { key: "capacity", placeholder: "2", type: "number", width: 50, center: true },
                ]}
                onChange={(id, key, val) =>
                  setLocalStands((prev) => prev.map((x) => (x.id === id ? { ...x, [key]: val } : x)))
                }
                onDelete={() => setLocalStands((prev) => prev.filter((x) => x.id !== s.id))}
                onMoveUp={() => setLocalStands((prev) => move(prev, i, i - 1))}
                onMoveDown={() => setLocalStands((prev) => move(prev, i, i + 1))}
                isFirst={i === 0}
                isLast={i === localStands.length - 1}
                mobile={mobile}
              />
            ))}
          </div>
          <button
            onClick={() =>
              setLocalStands((prev) => [
                ...prev,
                { id: uid(), emoji: "🎯", label: "", capacity: 2, position: prev.length },
              ])
            }
            style={{ ...smallBtn(T.primary, T.primaryBg), marginTop: 8 }}
          >
            + Ajouter un stand
          </button>
          <button
            onClick={saveStandsSlots}
            disabled={saving}
            style={{ ...btn(true, mobile), background: T.primary, opacity: saving ? 0.5 : 1 }}
          >
            {saving ? "Enregistrement…" : "💾 Enregistrer stands & créneaux"}
          </button>
        </div>
      )}

      {/* ─── SLOTS TAB ─── */}
      {tab === "slots" && (
        <>
          {/* Créneaux des stands (1h) */}
          <div style={card(mobile)}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px", fontFamily: T.font }}>
              🎪 Créneaux des stands
            </h3>
            <p style={{ fontSize: 11, color: T.hint, margin: "0 0 12px", fontFamily: T.font }}>
              Durée : 1 heure · Cliquez pour activer/désactiver
            </p>

            {/* Grille de boutons toggle */}
            <div style={{
              display: "grid",
              gridTemplateColumns: mobile ? "repeat(4, 1fr)" : "repeat(auto-fill, minmax(70px, 1fr))",
              gap: 8,
              marginBottom: 12,
            }}>
              {STAND_SLOTS.map(slot => {
                const isActive = activeStandSlots.has(slot.id);
                return (
                  <button
                    key={slot.id}
                    onClick={() => {
                      setActiveStandSlots(prev => {
                        const next = new Set(prev);
                        if (next.has(slot.id)) next.delete(slot.id);
                        else next.add(slot.id);
                        return next;
                      });
                    }}
                    style={{
                      padding: "10px 4px",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: isActive ? 800 : 600,
                      fontFamily: T.font,
                      cursor: "pointer",
                      transition: "all .2s",
                      border: isActive ? `2px solid ${T.primaryDk}` : "2px solid transparent",
                      background: isActive ? T.primary : T.surfaceAlt,
                      color: isActive ? "#fff" : T.muted,
                      boxShadow: isActive ? "0 2px 8px rgba(249,115,22,.2)" : "none",
                    }}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>

            {/* Résumé */}
            <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginTop: 8, fontFamily: T.font }}>
              {activeStandSlots.size === 0 ? (
                <em>Aucun créneau sélectionné</em>
              ) : (
                <>
                  {activeStandSlots.size} créneau{activeStandSlots.size > 1 ? "x" : ""} sélectionné{activeStandSlots.size > 1 ? "s" : ""} : {" "}
                  {Array.from(activeStandSlots).sort().join(", ")}
                </>
              )}
            </div>
          </div>

          {/* Créneaux de sécurisation (30min) */}
          <div style={card(mobile)}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px", fontFamily: T.font }}>
              🔒 Créneaux de sécurisation
            </h3>
            <p style={{ fontSize: 11, color: T.hint, margin: "0 0 12px", fontFamily: T.font }}>
              Durée : 30 minutes · Cliquez pour activer/désactiver
            </p>

            {/* Grille de boutons toggle */}
            <div style={{
              display: "grid",
              gridTemplateColumns: mobile ? "repeat(4, 1fr)" : "repeat(auto-fill, minmax(62px, 1fr))",
              gap: 8,
              marginBottom: 12,
            }}>
              {SECU_SLOTS.map(slot => {
                const isActive = activeSecuSlots.has(slot.id);
                return (
                  <button
                    key={slot.id}
                    onClick={() => {
                      setActiveSecuSlots(prev => {
                        const next = new Set(prev);
                        if (next.has(slot.id)) next.delete(slot.id);
                        else next.add(slot.id);
                        return next;
                      });
                    }}
                    style={{
                      padding: "8px 3px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: isActive ? 800 : 600,
                      fontFamily: T.font,
                      cursor: "pointer",
                      transition: "all .2s",
                      border: isActive ? "2px solid #6D28D9" : "2px solid transparent",
                      background: isActive ? "#7C3AED" : T.surfaceAlt,
                      color: isActive ? "#fff" : T.muted,
                      boxShadow: isActive ? "0 2px 8px rgba(124,58,237,.2)" : "none",
                    }}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>

            {/* Résumé */}
            <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginTop: 8, fontFamily: T.font }}>
              {activeSecuSlots.size === 0 ? (
                <em>Aucun créneau sélectionné</em>
              ) : (
                <>
                  {activeSecuSlots.size} créneau{activeSecuSlots.size > 1 ? "x" : ""} sélectionné{activeSecuSlots.size > 1 ? "s" : ""} : {" "}
                  {Array.from(activeSecuSlots).sort((a, b) => {
                    // Tri personnalisé pour gérer XXh et XXh30
                    const parseSlot = (s) => {
                      const match = s.match(/^(\d+)h(\d+)?$/);
                      if (!match) return 0;
                      const h = parseInt(match[1]);
                      const m = match[2] ? parseInt(match[2]) : 0;
                      return h * 60 + m;
                    };
                    return parseSlot(a) - parseSlot(b);
                  }).join(", ")}
                </>
              )}
            </div>
          </div>

          {/* Bouton sauvegarder global */}
          <button
            onClick={async () => {
              setSaving(true);
              try {
                // Fonction pour trouver un slot existant par label et type
                const findExistingSlot = (label, type) => {
                  return localSlots.find(s =>
                    s.label === label &&
                    (type === 'securite' ? s.type === 'securite' : s.type !== 'securite')
                  );
                };

                // Reconstruire les slots depuis les sets actifs EN GARDANT LES IDs EXISTANTS
                const standSlots = STAND_SLOTS
                  .filter(s => activeStandSlots.has(s.id))
                  .map((s, i) => {
                    const existing = findExistingSlot(s.label, 'normal');
                    return {
                      id: existing ? existing.id : s.id, // GARDER l'ID existant !
                      label: s.label,
                      position: i,
                      type: 'normal',
                    };
                  });

                const secuSlots = SECU_SLOTS
                  .filter(s => activeSecuSlots.has(s.id))
                  .map((s, i) => {
                    const existing = findExistingSlot(s.label, 'securite');
                    return {
                      id: existing ? existing.id : s.id, // GARDER l'ID existant !
                      label: s.label,
                      position: standSlots.length + i,
                      type: 'securite',
                    };
                  });

                const allSlots = [...standSlots, ...secuSlots];

                // Appeler directement l'API avec les nouveaux slots
                const res = await fetch("/api/save-stands", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    stands: localStands.map((s, i) => ({ ...s, position: i })),
                    timeslots: allSlots.map((t, i) => ({ ...t, position: i })),
                  }),
                });

                if (!res.ok) throw new Error(await res.text());

                showToast("✅ Créneaux enregistrés");
                onRefresh();
              } catch (err) {
                showToast("❌ Erreur : " + err.message);
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            style={{ ...btn(true, mobile), background: T.primary, opacity: saving ? 0.5 : 1 }}
          >
            {saving ? "Enregistrement…" : "💾 Enregistrer les créneaux"}
          </button>
        </>
      )}

      {/* ─── GENERAL TAB ─── */}
      {tab === "general" && (
        <div style={card(mobile)}>
          <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 10px", fontFamily: T.font }}>⚙️ Général</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={lbl(mobile)}>Titre</label>
              <input
                value={localCfg.title}
                onChange={(e) => setLocalCfg((c) => ({ ...c, title: e.target.value }))}
                style={inputBase(mobile)}
              />
            </div>
            <div>
              <label style={lbl(mobile)}>Description</label>
              <input
                value={localCfg.description || ""}
                onChange={(e) => setLocalCfg((c) => ({ ...c, description: e.target.value }))}
                style={inputBase(mobile)}
              />
            </div>
            <div>
              <label style={lbl(mobile)}>Texte d'information</label>
              <div style={{ fontSize: 10, color: T.hint, marginBottom: 3, fontFamily: T.font }}>
                Affiché sous le formulaire · Supporte **gras**, *italique*, [liens](url) et retours à la ligne
              </div>
              <textarea
                rows={5}
                value={localCfg.info_text || ""}
                onChange={(e) => setLocalCfg((c) => ({ ...c, info_text: e.target.value }))}
                placeholder="Bienvenue à la kermesse ! **Pensez à arriver 15 min avant** votre créneau.
Plus d'infos sur [le site de l'école](https://...)"
                style={{ ...inputBase(mobile), resize: "vertical" }}
              />
            </div>
            <div>
              <label style={lbl(mobile)}>Autoriser la suppression</label>
              <div style={{ fontSize: 10, color: T.hint, marginBottom: 6, fontFamily: T.font }}>
                Permettre aux parents de supprimer leurs créneaux (l'ajout reste toujours possible)
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => setLocalCfg((c) => ({ ...c, allow_modifications: !c.allow_modifications }))}
                  style={{
                    width: 50,
                    height: 26,
                    borderRadius: 13,
                    border: "none",
                    cursor: "pointer",
                    background: localCfg.allow_modifications ? "#10B981" : "#D1D5DB",
                    position: "relative",
                    transition: "background .2s",
                    padding: 0,
                  }}
                >
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    left: localCfg.allow_modifications ? 26 : 2,
                    transition: "left .2s",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }} />
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: localCfg.allow_modifications ? "#10B981" : T.muted, fontFamily: T.font }}>
                  {localCfg.allow_modifications ? "Activé" : "Désactivé"}
                </span>
              </div>
            </div>
            <div>
              <label style={lbl(mobile)}>Mot de passe admin</label>
              <input
                value={localCfg.admin_password}
                onChange={(e) => setLocalCfg((c) => ({ ...c, admin_password: e.target.value }))}
                style={inputBase(mobile)}
              />
            </div>
          </div>
          <button
            onClick={saveConfig}
            disabled={saving}
            style={{ ...btn(true, mobile), background: T.primary, opacity: saving ? 0.5 : 1 }}
          >
            {saving ? "Enregistrement…" : "💾 Enregistrer"}
          </button>
        </div>
      )}

      {/* ─── SPECTACLES TAB ─── */}
      {tab === "spectacles" && (
        <div style={card(mobile)}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 2px", fontFamily: T.font }}>
              🎭 Spectacles des classes
            </h3>
            <p style={{ fontSize: 11, color: T.hint, margin: 0, fontFamily: T.font }}>
              Agenda de la journée · Les spectacles sont affichés aux parents sur la page d'accueil
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {localSpectacles.map((s, i) => (
              <div key={s.id} style={{
                display: "flex",
                gap: mobile ? 4 : 6,
                alignItems: "center",
                padding: mobile ? "6px 8px" : "8px 10px",
                background: T.surfaceAlt,
                borderRadius: 9,
                border: `1px solid ${T.border}`,
              }}>
                {/* Heure */}
                <input
                  type="text"
                  value={s.heure}
                  onChange={(e) =>
                    setLocalSpectacles((prev) =>
                      prev.map((x) => (x.id === s.id ? { ...x, heure: e.target.value } : x))
                    )
                  }
                  placeholder="10h00"
                  style={{
                    width: mobile ? 50 : 60,
                    padding: mobile ? "5px 6px" : "6px 8px",
                    borderRadius: 6,
                    border: `1px solid ${T.border}`,
                    fontSize: mobile ? 11 : 12,
                    fontWeight: 700,
                    fontFamily: T.font,
                    background: "#fff",
                    outline: "none",
                  }}
                />

                {/* Classe */}
                <input
                  type="text"
                  value={s.classe}
                  onChange={(e) =>
                    setLocalSpectacles((prev) =>
                      prev.map((x) => (x.id === s.id ? { ...x, classe: e.target.value } : x))
                    )
                  }
                  placeholder="PS"
                  style={{
                    width: mobile ? 40 : 50,
                    padding: mobile ? "5px 6px" : "6px 8px",
                    borderRadius: 6,
                    border: `1px solid ${T.border}`,
                    fontSize: mobile ? 11 : 12,
                    fontWeight: 600,
                    fontFamily: T.font,
                    background: "#fff",
                    outline: "none",
                  }}
                />

                {/* Spectacle */}
                <input
                  type="text"
                  value={s.titre}
                  onChange={(e) =>
                    setLocalSpectacles((prev) =>
                      prev.map((x) => (x.id === s.id ? { ...x, titre: e.target.value } : x))
                    )
                  }
                  placeholder="Les petits poissons"
                  style={{
                    flex: 1,
                    padding: mobile ? "5px 6px" : "6px 8px",
                    borderRadius: 6,
                    border: `1px solid ${T.border}`,
                    fontSize: mobile ? 11 : 12,
                    fontWeight: 600,
                    fontFamily: T.font,
                    background: "#fff",
                    outline: "none",
                  }}
                />

                {/* Enseignant */}
                <input
                  type="text"
                  value={s.enseignant}
                  onChange={(e) =>
                    setLocalSpectacles((prev) =>
                      prev.map((x) => (x.id === s.id ? { ...x, enseignant: e.target.value } : x))
                    )
                  }
                  placeholder="Mme Dupont"
                  style={{
                    width: mobile ? 70 : 100,
                    padding: mobile ? "5px 6px" : "6px 8px",
                    borderRadius: 6,
                    border: `1px solid ${T.border}`,
                    fontSize: mobile ? 11 : 12,
                    fontWeight: 600,
                    fontFamily: T.font,
                    background: "#fff",
                    outline: "none",
                  }}
                />

                {/* Actions */}
                <div style={{ display: "flex", gap: 2 }}>
                  <button
                    onClick={() => setLocalSpectacles((prev) => move(prev, i, i - 1))}
                    disabled={i === 0}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: i === 0 ? "default" : "pointer",
                      fontSize: mobile ? 12 : 14,
                      padding: 2,
                      lineHeight: 1,
                      opacity: i === 0 ? 0.3 : 1,
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => setLocalSpectacles((prev) => move(prev, i, i + 1))}
                    disabled={i === localSpectacles.length - 1}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: i === localSpectacles.length - 1 ? "default" : "pointer",
                      fontSize: mobile ? 12 : 14,
                      padding: 2,
                      lineHeight: 1,
                      opacity: i === localSpectacles.length - 1 ? 0.3 : 1,
                    }}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => setLocalSpectacles((prev) => prev.filter((x) => x.id !== s.id))}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: mobile ? 12 : 14,
                      padding: 2,
                      lineHeight: 1,
                      color: "#DC2626",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() =>
              setLocalSpectacles((prev) => [
                ...prev,
                {
                  id: uid(),
                  heure: "",
                  classe: "",
                  titre: "",
                  enseignant: "",
                  position: prev.length,
                },
              ])
            }
            style={{ ...smallBtn("#7C3AED", "#FDF4FF"), marginTop: 8 }}
          >
            🎭 + Ajouter un spectacle
          </button>

          <button
            onClick={saveSpectacles}
            disabled={saving}
            style={{ ...btn(true, mobile), background: T.primary, opacity: saving ? 0.5 : 1 }}
          >
            {saving ? "Enregistrement…" : "💾 Enregistrer les spectacles"}
          </button>
        </div>
      )}

      {/* ─── INSCRIPTIONS TAB ─── */}
      {tab === "inscriptions" && (
        <div style={card(mobile)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, fontFamily: T.font }}>
              👥 Inscriptions ({insCount})
            </h3>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={exportCSV} style={smallBtn("#065F46", "#F0FDF4")}>
                📥 Exporter CSV
              </button>
              <button onClick={exportPDF} style={smallBtn("#1E40AF", "#EFF6FF")}>
                📄 Exporter PDF
              </button>
              <button onClick={resetAll} style={smallBtn("#991B1B", "#FEF2F2")}>
                🗑 Tout supprimer
              </button>
            </div>
          </div>

          {Object.entries(byEmail).length === 0 && (
            <p style={{ color: T.muted, fontSize: 13, fontFamily: T.font }}>Aucune inscription pour le moment.</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(byEmail).map(([email, list]) => {
              const first = list[0];
              return (
                <div key={email} style={{
                  border: `1px solid ${T.border}`, borderRadius: 10,
                  padding: mobile ? "8px 10px" : "10px 14px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: T.text, fontFamily: T.font }}>
                        {first.name}
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>
                        {email} {first.phone ? `· ${first.phone}` : ""}
                      </div>
                      <div style={{ fontSize: 10, color: T.hint, fontFamily: T.font }}>
                        {first.created_at && new Date(first.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {list.map((ins) => {
                      const stand = stands.find((s) => s.id === ins.stand_id);
                      const slot = timeslots.find((t) => t.id === ins.slot_id);
                      return (
                        <div key={ins.id} style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "3px 8px", borderRadius: 99,
                          background: T.primaryBg, color: T.primaryDk,
                          fontSize: 11, fontWeight: 700, fontFamily: T.font,
                        }}>
                          {stand?.emoji} {stand?.label}
                          <span style={{
                            background: "rgba(194,65,12,.1)", borderRadius: 99,
                            padding: "1px 6px", fontSize: 10, fontWeight: 800,
                          }}>
                            {slot?.label}
                          </span>
                          <span
                            onClick={() => deleteInscription(ins.id)}
                            style={{ cursor: "pointer", fontSize: 11, color: "#DC2626", marginLeft: 2 }}
                          >
                            ✕
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
