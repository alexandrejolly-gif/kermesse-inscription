import { C } from "../styles/theme";

export default function MyRecap({ inscriptions, email, stands, timeslots, onRemove, mobile }) {
  const mine = inscriptions.filter((i) => i.email === email);
  if (!mine.length) return null;

  return (
    <div style={{
      marginTop: mobile ? 8 : 14,
      background: C.me.light, borderRadius: mobile ? 10 : 12,
      border: `1.5px solid ${C.me.bg}44`, padding: mobile ? "10px 10px" : "12px 14px",
    }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: C.me.bg, marginBottom: 6 }}>
        📋 Mes inscriptions
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {mine.map((ins) => {
          const stand = stands.find((s) => s.id === ins.stand_id);
          const slot = timeslots.find((t) => t.id === ins.slot_id);
          if (!stand || !slot) return null;
          return (
            <div key={ins.id} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: mobile ? "3px 8px" : "4px 10px", borderRadius: 99,
              background: C.me.bg, color: "#fff",
              fontSize: mobile ? 10 : 11, fontWeight: 700,
            }}>
              {stand.emoji} {mobile ? "" : stand.label + " "}
              <span style={{
                background: "rgba(255,255,255,.25)", borderRadius: 99,
                padding: "1px 6px", fontSize: 10, fontWeight: 800,
              }}>
                {slot.label}
              </span>
              <span
                onClick={() => onRemove(ins.id, ins.stand_id, ins.slot_id)}
                style={{ cursor: "pointer", fontSize: 12, opacity: 0.7, marginLeft: 1 }}
              >
                ✕
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
