import { T, inputBase, iconBtn } from "../styles/theme";

export default function EditableItem({ item, fields, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast, mobile }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: mobile ? 4 : 8,
      padding: mobile ? "6px 8px" : "8px 10px",
      background: T.surface,
      borderRadius: 8,
      border: `1px solid ${T.border}`,
    }}>
      {fields.map((f) => (
        <input
          key={f.key}
          value={item[f.key] || ""}
          placeholder={f.placeholder}
          type={f.type || "text"}
          onChange={(e) => onChange(item.id, f.key, f.type === "number" ? parseInt(e.target.value) || 0 : e.target.value)}
          style={{
            ...inputBase(mobile),
            width: f.width || "auto",
            flex: f.flex || "none",
            textAlign: f.center ? "center" : "left",
            fontSize: mobile ? 12 : 13,
          }}
        />
      ))}

      <div style={{ display: "flex", gap: 2, marginLeft: "auto", flexShrink: 0 }}>
        <button onClick={onMoveUp} disabled={isFirst} style={{ ...iconBtn(mobile), opacity: isFirst ? 0.3 : 1 }} title="Monter">↑</button>
        <button onClick={onMoveDown} disabled={isLast} style={{ ...iconBtn(mobile), opacity: isLast ? 0.3 : 1 }} title="Descendre">↓</button>
        <button onClick={onDelete} style={{ ...iconBtn(mobile), color: "#DC2626" }} title="Supprimer">✕</button>
      </div>
    </div>
  );
}
