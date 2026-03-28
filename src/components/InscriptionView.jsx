import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { T, C, btn, uid, isEmail, useResponsive } from "../styles/theme";
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

  const currentEmail = form.email.trim().toLowerCase();

  // Email blur: find existing inscriptions
  const handleEmailBlur = useCallback(() => {
    if (!currentEmail || !isEmail(currentEmail)) {
      setEditingHint(false);
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
    } else {
      setEditingHint(false);
    }
  }, [currentEmail, inscriptions]);

  // Add inscription (click on free slot)
  const handleAdd = useCallback(async (standId, slotId) => {
    if (!currentEmail) {
      showToast("❌ Renseignez votre email d'abord");
      return;
    }
    if (!isEmail(currentEmail)) {
      showToast("❌ Email invalide");
      return;
    }

    const stand = stands.find((s) => s.id === standId);
    const slotList = inscriptions.filter((i) => i.stand_id === standId && i.slot_id === slotId);
    if (slotList.length >= stand.capacity) {
      showToast("❌ Complet");
      return;
    }
    if (inscriptions.some((i) => i.email === currentEmail && i.slot_id === slotId)) {
      showToast("❌ Conflit horaire — vous êtes déjà inscrit·e sur ce créneau");
      return;
    }

    const name = `${form.firstName} ${form.lastName}`.trim() || "Vous";
    const slot = timeslots.find((t) => t.id === slotId);

    const { error } = await supabase.from("ins_inscriptions").insert({
      id: uid(),
      email: currentEmail,
      name,
      phone: form.phone || "",
      stand_id: standId,
      slot_id: slotId,
    });

    if (error) {
      if (error.code === "23505") {
        showToast("❌ Conflit horaire");
      } else {
        showToast("❌ Erreur : " + error.message);
      }
      return;
    }

    showToast(`✅ ${stand.emoji} ${stand.label} · ${slot.label}`);
    onRefresh();
  }, [currentEmail, form, stands, timeslots, inscriptions, showToast, onRefresh]);

  // Remove inscription
  const handleRemove = useCallback(async (insId, standId, slotId) => {
    const stand = stands.find((s) => s.id === standId);
    const slot = timeslots.find((t) => t.id === slotId);

    const { error } = await supabase.from("ins_inscriptions").delete().eq("id", insId);
    if (error) {
      showToast("❌ Erreur : " + error.message);
      return;
    }
    showToast(`❌ Désinscription — ${stand?.emoji || ""} ${slot?.label || ""}`);
    onRefresh();
  }, [stands, timeslots, showToast, onRefresh]);

  // Submit / Validate
  const handleSubmit = async () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = true;
    if (!form.lastName.trim()) e.lastName = true;
    if (!currentEmail || !isEmail(currentEmail)) e.email = true;
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const mc = inscriptions.filter((i) => i.email === currentEmail).length;
    if (mc === 0) {
      showToast("❌ Sélectionnez au moins un créneau");
      return;
    }

    setSubmitting(true);

    // Update name/phone on all my inscriptions
    const name = `${form.firstName.trim()} ${form.lastName.trim()}`;
    await supabase
      .from("ins_inscriptions")
      .update({ name, phone: form.phone || "" })
      .eq("email", currentEmail);

    // Send confirmation email
    const myInscriptions = inscriptions
      .filter((i) => i.email === currentEmail)
      .map((i) => {
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

    setSubmitting(false);
    setSubmitted(true);
  };

  const mc = inscriptions.filter((i) => i.email === currentEmail).length;

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

      <Matrix
        inscriptions={inscriptions}
        stands={stands}
        timeslots={timeslots}
        email={currentEmail}
        onAdd={handleAdd}
        onRemove={handleRemove}
        mobile={mobile}
      />

      <MyRecap
        inscriptions={inscriptions}
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
