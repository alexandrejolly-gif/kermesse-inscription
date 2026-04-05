import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { T, C, btn, uid, isEmail, isPhone, useResponsive, renderMarkdown } from "../styles/theme";
import IdentityForm from "./IdentityForm";
import Matrix from "./Matrix";
import MyRecap from "./MyRecap";

export default function InscriptionView({ stands, timeslots, spectacles, inscriptions, cfg, showToast, onRefresh }) {
  const { mobile } = useResponsive();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [editingHint, setEditingHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Panier local (inscriptions non validées)
  const [localCart, setLocalCart] = useState([]);

  const currentEmail = form.email.trim().toLowerCase();

  // Vérifier si les modifications sont autorisées
  const canModify = cfg.allow_modifications !== false || !editingHint;

  // Email blur: find existing inscriptions
  const handleEmailBlur = useCallback(() => {
    if (!currentEmail || !isEmail(currentEmail)) {
      setEditingHint(false);
      setLocalCart([]); // Vider le panier si email invalide
      return;
    }
    const existing = inscriptions.find((i) => i.email.toLowerCase() === currentEmail);
    if (existing) {
      const parts = existing.name.split(" ");
      setForm((f) => ({
        ...f,
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ") || "",
        phone: existing.phone || f.phone,
      }));
      setEditingHint(true);
      setErrors({});
      // Charger les inscriptions existantes dans le panier (dédupliquées par slot_id)
      const myExisting = inscriptions.filter((i) => i.email.toLowerCase() === currentEmail);
      const seen = new Set();
      const unique = myExisting.filter(ins => {
        if (seen.has(ins.slot_id)) return false;
        seen.add(ins.slot_id);
        return true;
      });
      setLocalCart(unique);
    } else {
      setEditingHint(false);
      setLocalCart([]);
    }
  }, [currentEmail, inscriptions]);

  // Fusionner inscriptions : toutes SAUF celles de l'utilisateur (qui sont dans localCart)
  const allInscriptions = [
    ...inscriptions.filter(i => i.email.toLowerCase() !== currentEmail),
    ...localCart
  ];

  // Séparer stands et timeslots par type (normal vs sécurité)
  const normalStands = stands.filter(s => s.type !== 'securite');
  const securiteStands = stands.filter(s => s.type === 'securite');
  const normalTimeslots = timeslots.filter(t => t.type !== 'securite');
  const securiteTimeslots = timeslots.filter(t => t.type === 'securite');

  // Fonction pour parser un horaire "HH:MM" en minutes depuis minuit
  const parseTime = useCallback((timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }, []);

  // Fonction pour extraire les horaires depuis un label avec durée implicite selon le type
  const parseTimeslotLabel = useCallback((label, type) => {
    if (!label) return { start: null, end: null };

    // Format avec plage explicite : "14h-15h", "14h30-15h", etc.
    const rangeMatch = label.match(/(\d{1,2})h?(\d{2})?[-–](\d{1,2})h?(\d{2})?/);
    if (rangeMatch) {
      const startHour = parseInt(rangeMatch[1]);
      const startMin = rangeMatch[2] ? parseInt(rangeMatch[2]) : 0;
      const endHour = parseInt(rangeMatch[3]);
      const endMin = rangeMatch[4] ? parseInt(rangeMatch[4]) : 0;

      return {
        start: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
        end: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
      };
    }

    // Format simple : "14h" ou "14h30" → durée implicite selon le type
    const simpleMatch = label.match(/^(\d{1,2})h(\d{2})?$/);
    if (simpleMatch) {
      const startHour = parseInt(simpleMatch[1]);
      const startMin = simpleMatch[2] ? parseInt(simpleMatch[2]) : 0;

      // Durée implicite : 1h pour normal, 30min pour sécurité
      const duration = type === 'securite' ? 30 : 60;
      let endHour = startHour;
      let endMin = startMin + duration;

      if (endMin >= 60) {
        endHour += Math.floor(endMin / 60);
        endMin = endMin % 60;
      }

      return {
        start: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
        end: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
      };
    }

    return { start: null, end: null };
  }, []);

  // Fonction pour obtenir les horaires d'un slot (depuis start_time/end_time ou en parsant le label)
  const getSlotTimes = useCallback((slot) => {
    if (!slot) return { start: null, end: null };

    // Priorité aux champs start_time/end_time s'ils existent
    if (slot.start_time && slot.end_time) {
      return { start: slot.start_time, end: slot.end_time };
    }

    // Sinon, parser le label avec le type pour durée implicite
    return parseTimeslotLabel(slot.label, slot.type || 'normal');
  }, [parseTimeslotLabel]);

  // Fonction pour vérifier si un slot chevauche les créneaux de l'utilisateur (pour désactivation visuelle)
  const hasTimeConflictWithSlot = useCallback((slotId) => {
    const slot = timeslots.find(t => t.id === slotId);
    if (!slot) return false;

    const slotTimes = getSlotTimes(slot);
    if (!slotTimes.start || !slotTimes.end) return false;

    const slotStart = parseTime(slotTimes.start);
    const slotEnd = parseTime(slotTimes.end);
    if (slotStart === null || slotEnd === null) return false;

    return localCart.some(ins => {
      const insSlot = timeslots.find(t => t.id === ins.slot_id);
      if (!insSlot) return false;

      const insTimes = getSlotTimes(insSlot);
      if (!insTimes.start || !insTimes.end) return false;

      const insStart = parseTime(insTimes.start);
      const insEnd = parseTime(insTimes.end);
      if (insStart === null || insEnd === null) return false;

      // Chevauchement si : slotStart < insEnd ET slotEnd > insStart
      return slotStart < insEnd && slotEnd > insStart;
    });
  }, [localCart, timeslots, parseTime, getSlotTimes]);

  // Add inscription to local cart
  const handleAdd = useCallback((standId, slotId) => {
    // Bloquer si modifications désactivées et utilisateur a déjà des inscriptions
    if (!canModify) {
      showToast("❌ Modifications désactivées - contactez les organisateurs");
      return;
    }

    // Vérifier que tous les champs obligatoires sont remplis
    if (!form.firstName.trim() || !form.lastName.trim() || !currentEmail || !form.phone.trim()) {
      showToast("❌ Remplissez tous les champs (prénom, nom, email, téléphone)");
      return;
    }
    if (!isEmail(currentEmail)) {
      showToast("❌ Email invalide (format: exemple@domaine.fr)");
      return;
    }
    if (!isPhone(form.phone)) {
      showToast("❌ Téléphone invalide (format: 10 chiffres, ex: 0612345678)");
      return;
    }

    const stand = stands.find((s) => s.id === standId);
    const slotList = allInscriptions.filter((i) => i.stand_id === standId && i.slot_id === slotId);
    if (slotList.length >= stand.capacity) {
      showToast("❌ Complet");
      return;
    }
    // La vérification de conflit est gérée visuellement dans Matrix (pas de message d'erreur)

    const name = `${form.firstName.trim()} ${form.lastName.trim()}`;
    const slot = timeslots.find((t) => t.id === slotId);

    // Ajouter au panier local
    const newInscription = {
      id: uid(),
      email: currentEmail,
      name,
      phone: form.phone || "",
      stand_id: standId,
      slot_id: slotId,
    };

    setLocalCart(prev => [...prev, newInscription]);
    showToast(`✅ ${stand.emoji} ${stand.label} · ${slot.label}`);
  }, [currentEmail, form, stands, timeslots, allInscriptions, showToast, canModify]);

  // Remove inscription from local cart
  const handleRemove = useCallback((insId, standId, slotId) => {
    // Bloquer si modifications désactivées et utilisateur a déjà des inscriptions
    if (!canModify) {
      showToast("❌ Modifications désactivées - contactez les organisateurs");
      return;
    }

    const stand = stands.find((s) => s.id === standId);
    const slot = timeslots.find((t) => t.id === slotId);

    setLocalCart(prev => prev.filter(i => i.id !== insId));
    showToast(`❌ Retrait — ${stand?.emoji || ""} ${slot?.label || ""}`);
  }, [stands, timeslots, showToast, canModify]);

  // Submit / Validate - save to Supabase
  const handleSubmit = async () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = true;
    if (!form.lastName.trim()) e.lastName = true;
    if (!currentEmail || !isEmail(currentEmail)) e.email = true;
    if (!form.phone.trim() || !isPhone(form.phone)) e.phone = true;
    setErrors(e);
    if (Object.keys(e).length > 0) {
      showToast("❌ Vérifiez le format de vos informations");
      return;
    }

    const mc = localCart.length;
    if (mc === 0) {
      showToast("❌ Sélectionnez au moins un créneau");
      return;
    }

    setSubmitting(true);

    try {
      // Supprimer les anciennes inscriptions pour cet email (case-insensitive via RPC)
      await supabase.rpc('delete_inscriptions_by_email', { user_email: currentEmail });

      // Insérer toutes les inscriptions du panier (dédupliquées par slot_id)
      const name = `${form.firstName.trim()} ${form.lastName.trim()}`;
      const toInsert = localCart.map(i => ({
        id: uid(),
        email: currentEmail,
        name,
        phone: form.phone || "",
        stand_id: i.stand_id,
        slot_id: i.slot_id,
      }));

      // Dédupliquer par slot_id pour éviter les erreurs de contrainte unique
      const seenSlots = new Set();
      const uniqueInserts = toInsert.filter(ins => {
        if (seenSlots.has(ins.slot_id)) return false;
        seenSlots.add(ins.slot_id);
        return true;
      });

      const { error } = await supabase.from("ins_inscriptions").insert(uniqueInserts);
      if (error) throw error;

      // Send confirmation email
      const myInscriptions = localCart.map((i) => {
        const stand = stands.find((s) => s.id === i.stand_id);
        const slot = timeslots.find((t) => t.id === i.slot_id);
        return { standLabel: stand?.label || "", standEmoji: stand?.emoji || "", slotLabel: slot?.label || "" };
      });

      // Trier par créneau horaire croissant
      myInscriptions.sort((a, b) => {
        const parseSlot = (label) => {
          const match = label.match(/^(\d{1,2})h(\d{2})?/);
          if (!match) return 0;
          return parseInt(match[1]) * 60 + (parseInt(match[2]) || 0);
        };
        return parseSlot(a.slotLabel) - parseSlot(b.slotLabel);
      });

      try {
        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: currentEmail,
            firstName: form.firstName.trim(),
            inscriptions: myInscriptions,
            siteTitle: cfg.title,
          }),
        });
        if (!res.ok) {
          console.warn("Email sending failed:", await res.text());
        }
      } catch (err) {
        console.warn("Email sending failed:", err);
      }

      onRefresh();
      setSubmitting(false);
      setSubmitted(true);
    } catch (err) {
      showToast("❌ Erreur : " + err.message);
      setSubmitting(false);
    }
  };

  const mc = localCart.length;

  // Thank you screen
  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.primary, marginBottom: 6, fontFamily: T.font }}>
          Merci !
        </h2>
        <p style={{ color: T.muted, marginBottom: 6, fontSize: 14, fontFamily: T.font }}>
          Vos {mc} inscription{mc > 1 ? "s" : ""} {mc > 1 ? "ont" : "a"} bien été enregistrée{mc > 1 ? "s" : ""}.
        </p>
        <p style={{ color: T.hint, marginBottom: 20, fontSize: 12, fontFamily: T.font }}>
          Un email de confirmation a été envoyé à <strong style={{ color: "#57534E" }}>{currentEmail}</strong>
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm({ firstName: "", lastName: "", email: "", phone: "" });
            setErrors({});
            setEditingHint(false);
            setLocalCart([]);
          }}
          style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: T.primary, color: "#fff", fontWeight: 800,
            fontSize: 14, cursor: "pointer", fontFamily: T.font,
          }}
        >
          Nouvelle inscription
        </button>
      </div>
    );
  }

  return (
    <>
      <IdentityForm
        form={form}
        setForm={setForm}
        errors={errors}
        onEmailBlur={handleEmailBlur}
        editingHint={editingHint}
        mobile={mobile}
        cfg={cfg}
      />

      {/* Zone info (texte markdown) */}
      {cfg.info_text && (
        <div style={{
          background: "#FFF7ED",
          border: "1px solid #FED7AA",
          borderRadius: mobile ? 12 : 14,
          padding: mobile ? "8px 14px" : "10px 18px",
          marginBottom: mobile ? 8 : 12,
          fontSize: mobile ? 13 : 14,
          lineHeight: 1.4,
          color: T.text,
          fontFamily: T.font,
        }}>
          {renderMarkdown(cfg.info_text)}
        </div>
      )}

      {/* Tableau des stands normaux */}
      {normalStands.length > 0 && normalTimeslots.length > 0 && (
        <>
          <h3 style={{
            fontSize: mobile ? 14 : 16,
            fontWeight: 800,
            margin: mobile ? "10px 0 8px" : "14px 0 10px",
            color: T.text,
            fontFamily: T.font,
          }}>
            🎪 Stands de la kermesse
          </h3>
          <Matrix
            inscriptions={allInscriptions}
            stands={normalStands}
            timeslots={normalTimeslots}
            email={currentEmail}
            onAdd={handleAdd}
            onRemove={handleRemove}
            hasTimeConflict={hasTimeConflictWithSlot}
            canModify={canModify}
            mobile={mobile}
          />
        </>
      )}

      {/* Tableau de la sécurisation */}
      {securiteStands.length > 0 && securiteTimeslots.length > 0 && (
        <>
          <h3 style={{
            fontSize: mobile ? 14 : 16,
            fontWeight: 800,
            margin: mobile ? "10px 0 8px" : "14px 0 10px",
            color: T.text,
            fontFamily: T.font,
          }}>
            🔒 Sécurisation de l'accès au site
          </h3>
          <Matrix
            inscriptions={allInscriptions}
            stands={securiteStands}
            timeslots={securiteTimeslots}
            email={currentEmail}
            onAdd={handleAdd}
            onRemove={handleRemove}
            hasTimeConflict={hasTimeConflictWithSlot}
            canModify={canModify}
            mobile={mobile}
          />
        </>
      )}

      <MyRecap
        inscriptions={localCart}
        email={currentEmail}
        stands={stands}
        timeslots={timeslots}
        onRemove={handleRemove}
        canModify={canModify}
        mobile={mobile}
      />

      {canModify && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            ...btn(mc > 0, mobile),
            opacity: submitting ? 0.5 : mc > 0 ? 1 : 0.7,
          }}
        >
          {submitting
            ? "Envoi en cours…"
            : mc > 0
              ? `✓ Valider mes ${mc} inscription${mc > 1 ? "s" : ""}`
              : "Sélectionnez des créneaux"}
        </button>
      )}

      {/* Tableau des spectacles */}
      {spectacles && spectacles.length > 0 && (
        <div style={{
          marginTop: mobile ? 8 : 12,
          background: "#fff",
          borderRadius: mobile ? 10 : 14,
          border: "1px solid #E7E5E0",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: mobile ? "10px 12px" : "12px 16px",
            borderBottom: "1px solid #E7E5E0",
            background: "#FDF4FF",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>🎭</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: mobile ? 14 : 15, color: "#1C1917", fontFamily: T.font }}>
                Spectacles des classes
              </div>
              <div style={{ fontSize: 11, color: "#78716C", fontFamily: T.font }}>
                Agenda de la journée
              </div>
            </div>
          </div>

          {/* Tableau */}
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: T.font,
            fontSize: mobile ? 12 : 14,
          }}>
            <thead>
              <tr style={{ background: "#FAF5FF" }}>
                <th style={{
                  padding: mobile ? "8px 6px" : "10px 12px",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: mobile ? 10 : 11,
                  color: "#78716C",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}>
                  Heure
                </th>
                <th style={{
                  padding: mobile ? "8px 6px" : "10px 12px",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: mobile ? 10 : 11,
                  color: "#78716C",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}>
                  Classe
                </th>
                <th style={{
                  padding: mobile ? "8px 6px" : "10px 12px",
                  textAlign: "left",
                  fontWeight: 700,
                  fontSize: mobile ? 10 : 11,
                  color: "#78716C",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}>
                  Spectacle
                </th>
                <th style={{
                  padding: mobile ? "8px 6px" : "10px 12px",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: mobile ? 10 : 11,
                  color: "#78716C",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}>
                  Enseignant·e
                </th>
              </tr>
            </thead>
            <tbody>
              {spectacles.map((s, i) => (
                <tr key={s.id} style={{
                  borderBottom: "1px solid #E7E5E0",
                  background: i % 2 === 0 ? "#fff" : "#FAFAF7",
                }}>
                  <td style={{
                    padding: mobile ? "8px 8px" : "10px 14px",
                    fontWeight: 800,
                    color: "#7C3AED",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}>
                    {s.heure}
                  </td>
                  <td style={{
                    padding: mobile ? "8px 6px" : "10px 12px",
                    fontWeight: 700,
                    textAlign: "center",
                  }}>
                    {s.classe}
                  </td>
                  <td style={{
                    padding: mobile ? "8px 6px" : "10px 12px",
                    fontWeight: 600,
                  }}>
                    {s.titre}
                  </td>
                  <td style={{
                    padding: mobile ? "8px 6px" : "10px 12px",
                    color: "#78716C",
                    textAlign: "center",
                  }}>
                    {s.enseignant}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
