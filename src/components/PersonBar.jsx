import { C } from "../styles/theme";

export default function PersonBar({ person, isMe, onRemove, onToggle, standId, slotId, activeTooltip, setActiveTooltip, canRemove = true, mobile }) {
  const barId = `${standId}-${slotId}-${person.email}`;
  const showing = activeTooltip === barId;

  const handleTap = (e) => {
    e.stopPropagation();
    if (isMe && canRemove) {
      onRemove(person.id, standId, slotId);
    } else if (!isMe) {
      setActiveTooltip(showing ? null : barId);
    }
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
            borderTop: "5px solid #1C1917",
          }} />
        </div>
      )}
      <div
        onClick={handleTap}
        onMouseEnter={() => { if (!isMe) setActiveTooltip(barId); }}
        onMouseLeave={() => { if (!isMe && showing) setActiveTooltip(null); }}
        style={{
          height: h, borderRadius: mobile ? 4 : 5,
          background: isMe ? C.me.bg : C.other.bg,
          display: "flex", alignItems: "center",
          padding: mobile ? "0 4px" : "0 6px", gap: 3,
          cursor: (isMe && canRemove) || !isMe ? "pointer" : "default",
          transition: "all .15s", overflow: "hidden",
          boxShadow: isMe ? `0 0 0 1.5px ${C.me.bg}, 0 2px 6px ${C.me.glow}` : "none",
        }}
      >
        <span style={{
          fontSize: mobile ? 8.5 : 9.5, fontWeight: 700,
          color: isMe ? C.me.text : C.other.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
        }}>
          {person.name}
        </span>
        {isMe && canRemove && <span style={{ fontSize: 7, color: "rgba(255,255,255,.6)", flexShrink: 0 }}>✕</span>}
      </div>
    </div>
  );
}
