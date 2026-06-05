import { inputBase, lbl, T, useResponsive } from "../styles/theme";

export default function IdentityForm({ form, setForm, errors, onEmailBlur, editingHint, cfg }) {
  const { mobile, width } = useResponsive();
  const isWide = width > 900; // 4 colonnes seulement si > 900px

  const iStyle = (field) => ({
    ...inputBase(mobile),
    borderColor: errors[field] ? "#FCA5A5" : T.border,
  });

  return (
    <div style={{
      background: "#fff", borderRadius: mobile ? 12 : 14,
      border: `1px solid ${T.border}`,
      padding: mobile ? "10px 12px" : "12px 16px",
      marginBottom: mobile ? 8 : 12,
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: isWide ? "1fr 1fr 1fr 1fr" : "1fr 1fr",
        gap: mobile ? "8px 8px" : "8px 12px",
      }}>
        <div>
          <label style={lbl(mobile)}>Prénom Nom *</label>
          <input
            value={form.parentName}
            placeholder="Marie Dupont"
            onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
            style={iStyle("parentName")}
          />
        </div>
        <div>
          <label style={lbl(mobile)}>Enfant Classe *</label>
          <input
            value={form.childClass}
            placeholder="Emma Dupont GS"
            onChange={(e) => setForm((f) => ({ ...f, childClass: e.target.value }))}
            style={iStyle("childClass")}
          />
        </div>
        <div>
          <label style={lbl(mobile)}>Email *</label>
          <input
            value={form.email}
            placeholder="marie@exemple.fr"
            type="email"
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            onBlur={onEmailBlur}
            style={iStyle("email")}
          />
        </div>
        <div>
          <label style={lbl(mobile)}>Téléphone *</label>
          <input
            value={form.phone}
            placeholder="06 12 34 56 78"
            type="tel"
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            style={iStyle("phone")}
          />
        </div>
      </div>
      {editingHint && (
        <p style={{
          color: cfg?.allow_modifications ? "#059669" : "#DC2626",
          fontSize: 11,
          fontWeight: 700,
          marginTop: 6,
          marginBottom: 0,
          lineHeight: 1.4,
        }}>
          {cfg?.allow_modifications
            ? "✏️ Inscriptions retrouvées - modifiez et re-soumettez."
            : "⚠️ Inscriptions retrouvées. Vous pouvez ajouter de nouveaux créneaux, mais pas supprimer les anciens. Pour tout désistement, merci de contacter directement les organisateurs."}
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
