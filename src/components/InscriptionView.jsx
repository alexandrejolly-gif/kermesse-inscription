import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { T, C, btn, uid, isEmail, isPhone, useResponsive } from "../styles/theme";
import IdentityForm from "./IdentityForm";
import Matrix from "./Matrix";
import MyRecap from "./MyRecap";

export default function InscriptionView({ stands, timeslots, inscriptions, cfg, showToast, onRefresh }) {
  const { mobile } = useResponsive();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [editingHint, setEditingHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Panier local (inscriptions non validées)
  const [localCart, setLocalCart] = useState([]);

  const currentEmail = form.email.trim().toLowerCase();

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

  // Fonction pour détecter les conflits horaires entre créneaux
  const hasTimeConflict = useCallback((newSlotId) => {
    const newSlot = timeslots.find(t => t.id === newSlotId);
    if (!newSlot || !newSlot.start_time || !newSlot.end_time) {
      // Si pas d'horaires définis, pas de conflit horaire possible
      return false;
    }

    const newStart = parseTime(newSlot.start_time);
    const newEnd = parseTime(newSlot.end_time);
    if (newStart === null || newEnd === null) return false;

    return localCart.some(ins => {
      const insSlot = timeslots.find(t => t.id === ins.slot_id);
      if (!insSlot || !insSlot.start_time || !insSlot.end_time) return false;

      const insStart = parseTime(insSlot.start_time);
      const insEnd = parseTime(insSlot.end_time);
      if (insStart === null || insEnd === null) return false;

      // Chevauchement si : newStart < insEnd ET newEnd > insStart
      return newStart < insEnd && newEnd > insStart;
    });
  }, [localCart, timeslots, parseTime]);

  // Add inscription to local cart
  const handleAdd = useCallback((standId, slotId) => {
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
    // Vérifier les conflits horaires (entre tous les tableaux)
    if (hasTimeConflict(slotId)) {
      showToast("❌ Conflit horaire — vous avez déjà un créneau qui chevauche");
      return;
    }
    // Si pas d'horaires définis, vérifier au moins le même slot_id
    if (localCart.some((i) => i.slot_id === slotId)) {
      showToast("❌ Vous êtes déjà inscrit·e sur ce créneau");
      return;
    }

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
  }, [currentEmail, form, stands, timeslots, allInscriptions, showToast, localCart, hasTimeConflict]);

  // Remove inscription from local cart
  const handleRemove = useCallback((insId, standId, slotId) => {
    const stand = stands.find((s) => s.id === standId);
    const slot = timeslots.find((t) => t.id === slotId);

    setLocalCart(prev => prev.filter(i => i.id !== insId));
    showToast(`❌ Retrait — ${stand?.emoji || ""} ${slot?.label || ""}`);
  }, [stands, timeslots, showToast]);

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
      />

      {/* Tableau des stands normaux */}
      {normalStands.length > 0 && normalTimeslots.length > 0 && (
        <>
          <h3 style={{
            fontSize: mobile ? 14 : 16,
            fontWeight: 800,
            margin: mobile ? "16px 0 8px" : "20px 0 10px",
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
            margin: mobile ? "16px 0 8px" : "20px 0 10px",
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
        mobile={mobile}
      />

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
    </>
  );
}
