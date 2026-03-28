import { T, C, useResponsive } from "../styles/theme";

export default function ResultsView({ stands, timeslots, inscriptions }) {
  const { mobile } = useResponsive();

  const getList = (sid, tid) => inscriptions.filter((i) => i.stand_id === sid && i.slot_id === tid);

  const barH = mobile ? 18 : 20;

  return (
    <div style={{
      background: "#fff", borderRadius: mobile ? 10 : 14,
      border: `1px solid ${T.border}`, overflow: "visible",
    }}>
      <div style={{
        padding: mobile ? "10px 12px" : "12px 16px",
        borderBottom: `1px solid ${T.border}`,
      }}>
        <h2 style={{ fontSize: mobile ? 14 : 16, fontWeight: 800, color: T.text, margin: 0, fontFamily: T.font }}>
          📊 Inscriptions en cours
        </h2>
        <p style={{ fontSize: 12, color: T.muted, margin: "2px 0 0", fontFamily: T.font }}>
          {inscriptions.length} inscription{inscriptions.length !== 1 ? "s" : ""} au total
        </p>
      </div>

      <table style={{
        width: "100%", borderCollapse: "collapse",
        fontFamily: T.font, tableLayout: "fixed",
      }}>
        <colgroup>
          <col style={{ width: mobile ? 44 : "15%" }} />
          {timeslots.map((t) => <col key={t.id} />)}
        </colgroup>
        <thead>
          <tr style={{ background: T.primaryBg }}>
            <th style={{
              padding: mobile ? "6px 2px" : "8px 4px",
              textAlign: "center", fontWeight: 800,
              borderBottom: `1.5px solid ${T.border}`,
              fontSize: mobile ? 9 : 10, color: T.muted,
            }}>
              <span style={{ fontSize: mobile ? 10 : 11 }}>🏪</span>
            </th>
            {timeslots.map((ts) => (
              <th key={ts.id} style={{
                padding: mobile ? "6px 1px" : "8px 2px",
                textAlign: "center", fontWeight: 800,
                borderBottom: `1.5px solid ${T.border}`,
                borderLeft: `1px solid ${T.border}`,
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
              <td style={{
                padding: mobile ? "4px 2px" : "6px 3px",
                borderRight: `1px solid ${T.border}`,
                textAlign: "center", verticalAlign: "middle",
              }}>
                <div style={{ fontSize: mobile ? 16 : 20, lineHeight: 1 }}>{stand.emoji}</div>
                <div style={{
                  fontSize: mobile ? 8 : 9, fontWeight: 800, color: "#44403C",
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
              {timeslots.map((ts) => {
                const list = getList(stand.id, ts.id);
                const full = list.length >= stand.capacity;
                const empty = stand.capacity - list.length;

                return (
                  <td key={ts.id} style={{
                    padding: mobile ? "3px 2px" : "4px 3px",
                    borderLeft: `1px solid ${T.border}`,
                    verticalAlign: "top",
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {list.map((p) => (
                        <div key={p.id} style={{
                          height: barH, borderRadius: mobile ? 4 : 5,
                          background: C.other.bg,
                          display: "flex", alignItems: "center",
                          padding: mobile ? "0 4px" : "0 6px",
                          overflow: "hidden",
                        }}>
                          <span style={{
                            fontSize: mobile ? 8 : 9, fontWeight: 700,
                            color: C.other.text,
                            overflow: "hidden", textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {p.name}
                          </span>
                        </div>
                      ))}
                      {Array.from({ length: empty }).map((_, i) => (
                        <div key={`e${i}`} style={{
                          height: barH, borderRadius: mobile ? 4 : 5,
                          border: `1.5px dashed ${C.free.border}`,
                          opacity: 0.4,
                        }} />
                      ))}
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
