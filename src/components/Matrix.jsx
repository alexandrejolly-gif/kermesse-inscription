import { useState, useEffect } from "react";
import { C, T } from "../styles/theme";
import PersonBar from "./PersonBar";

export default function Matrix({ inscriptions, stands, timeslots, email, onAdd, onRemove, hasTimeConflict, canRemove = true, mobile, hideStandColumn = false }) {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

  useEffect(() => {
    if (!activeTooltip) return;
    const close = () => setActiveTooltip(null);
    const timer = setTimeout(() => document.addEventListener("click", close, { once: true }), 10);
    return () => { clearTimeout(timer); document.removeEventListener("click", close); };
  }, [activeTooltip]);

  const barH = mobile ? 20 : 22;

  const getList = (sid, tid) => inscriptions.filter((i) => i.stand_id === sid && i.slot_id === tid);
  const isMine = (sid, tid) => inscriptions.some((i) => i.email === email && i.stand_id === sid && i.slot_id === tid);
  const hasConflict = (tid) => inscriptions.some((i) => i.email === email && i.slot_id === tid) || (hasTimeConflict && hasTimeConflict(tid));

  return (
    <div style={{
      background: "#fff", borderRadius: mobile ? 10 : 14,
      border: `1px solid ${T.border}`, overflow: "visible",
    }}>
      <table style={{
        width: "100%", borderCollapse: "collapse",
        fontFamily: T.font, tableLayout: "fixed",
      }}>
        <colgroup>
          {!hideStandColumn && <col style={{ width: mobile ? 80 : 120 }} />}
          {timeslots.map((t) => <col key={t.id} />)}
        </colgroup>
        <thead>
          <tr style={{ background: T.primaryBg }}>
            {!hideStandColumn && (
              <th style={{
                padding: mobile ? "6px 2px" : "8px 4px",
                borderBottom: `1.5px solid ${T.border}`,
                borderRight: `1px solid ${T.border}`,
                background: "transparent",
              }}>
              </th>
            )}
            {timeslots.map((ts, idx) => (
              <th key={ts.id} style={{
                padding: mobile ? "6px 1px" : "8px 2px",
                textAlign: "center", fontWeight: 800,
                borderBottom: `1.5px solid ${T.border}`,
                borderLeft: !hideStandColumn || idx > 0 ? `1px solid ${T.border}` : "none",
                fontSize: mobile ? 12 : 14, color: T.primaryDk,
                letterSpacing: "-0.02em",
              }}>
                {ts.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stands.map((stand, si) => (
            <tr key={stand.id} style={{
                borderBottom: `1px solid ${T.border}`,
                background: si % 2 === 0 ? "#fff" : T.surfaceAlt,
              }}>
                {!hideStandColumn && (
                  <td style={{
                    padding: mobile ? "4px 2px" : "6px 3px",
                    borderRight: `1px solid ${T.border}`,
                    textAlign: "center", verticalAlign: "middle",
                  }}>
                    <div style={{ fontSize: mobile ? 16 : 20, lineHeight: 1 }}>{stand.emoji}</div>
                    <div style={{
                      fontSize: mobile ? 8 : 11, fontWeight: 800, color: "#44403C",
                      lineHeight: 1.15, marginTop: 1,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    }}>
                      {stand.label}
                    </div>
                    <div style={{
                      fontSize: mobile ? 7 : 8, color: T.hint, fontWeight: 700, marginTop: 1,
                    }}>
                      {stand.capacity}p.
                    </div>
                  </td>
                )}
                {timeslots.map((ts, idx) => {
                const list = getList(stand.id, ts.id);
                const mine = isMine(stand.id, ts.id);
                const conflict = !mine && hasConflict(ts.id);
                const full = list.length >= stand.capacity;
                const canJoin = !mine && !full && !conflict;
                const empty = stand.capacity - list.length;

                return (
                  <td key={ts.id} style={{
                    padding: mobile ? "3px 2px" : "4px 3px",
                    borderLeft: !hideStandColumn || idx > 0 ? `1px solid ${T.border}` : "none",
                    verticalAlign: "top",
                    background: mine ? C.me.glow : "transparent",
                    transition: "background .25s",
                    overflow: "visible", position: "relative",
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {list.map((p) => (
                        <PersonBar
                          key={p.id}
                          person={p}
                          isMe={p.email === email}
                          onRemove={onRemove}
                          standId={stand.id}
                          slotId={ts.id}
                          activeTooltip={activeTooltip}
                          setActiveTooltip={setActiveTooltip}
                          canRemove={canRemove}
                          mobile={mobile}
                        />
                      ))}
                      {Array.from({ length: empty }).map((_, i) => {
                        const isFirst = i === 0;
                        const clickable = canJoin && isFirst; // Toujours permettre l'ajout
                        const cellKey = `${stand.id}-${ts.id}-${i}`;
                        const isHovered = hoveredCell === cellKey;
                        return (
                          <div
                            key={`e${i}`}
                            onClick={clickable ? () => onAdd(stand.id, ts.id) : undefined}
                            onMouseEnter={clickable ? () => setHoveredCell(cellKey) : undefined}
                            onMouseLeave={clickable ? () => setHoveredCell(null) : undefined}
                            style={{
                              height: barH, borderRadius: mobile ? 4 : 5,
                              border: clickable
                                ? isHovered
                                  ? `2px solid ${C.me.bg}`
                                  : `1.5px dashed ${C.joinable.border}`
                                : conflict && isFirst
                                  ? `1.5px dashed ${C.conflict.border}`
                                  : `1.5px dashed ${C.free.border}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: clickable ? "pointer" : "default",
                              transition: "all .2s",
                              opacity: clickable ? 1 : 0.4,
                              background: clickable
                                ? isHovered
                                  ? C.me.light
                                  : C.joinable.bg
                                : "transparent",
                              transform: isHovered ? "scale(1.05)" : "scale(1)",
                              boxShadow: isHovered ? `0 2px 8px ${C.me.glow}` : "none",
                            }}
                          >
                            <span style={{
                              fontSize: mobile ? 8 : 9, fontWeight: isHovered ? 800 : 700,
                              color: clickable
                                ? isHovered
                                  ? C.me.bg
                                  : C.joinable.text
                                : C.conflict.text,
                              transition: "all .2s",
                            }}>
                              {clickable
                                ? (mobile ? "+" : "+ Vous")
                                : conflict && isFirst
                                  ? (mobile ? "—" : "conflit")
                                  : ""}
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
