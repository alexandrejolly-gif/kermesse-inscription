import { T, useResponsive } from "../styles/theme";

const tabs = [
  { id: "inscription", icon: "📝", label: "Inscription" },
  { id: "resultats", icon: "📊", label: "Résultats" },
  { id: "admin", icon: "⚙️", label: "" },
];

export default function Header({ cfg, view, setView }) {
  const { mobile } = useResponsive();

  const headerImage = cfg.header_image;

  return (
    <div style={{
      position: "relative",
      background: headerImage
        ? `url(${headerImage}) center/cover no-repeat`
        : "linear-gradient(135deg, #EA580C 0%, #F97316 40%, #FB923C 100%)",
      borderRadius: "0 0 18px 18px",
      padding: mobile ? "12px 14px 10px" : "16px 18px 14px",
      marginBottom: mobile ? 8 : 12,
      boxShadow: "0 6px 28px rgba(249,115,22,.18)",
      overflow: "hidden",
    }}>
      {headerImage && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(234,88,12,.85), rgba(249,115,22,.75), rgba(251,146,60,.65))",
        }} />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        <h1 style={{
          fontSize: mobile ? 16 : 18, fontWeight: 800,
          color: "#fff", margin: 0, fontFamily: T.font,
        }}>
          {cfg.icon} {cfg.title}
        </h1>
        {cfg.description && (
          <p style={{
            fontSize: mobile ? 11 : 12,
            color: "rgba(255,255,255,.78)",
            margin: "3px 0 0", fontFamily: T.font,
          }}>
            {cfg.description}
          </p>
        )}

        <div style={{
          display: "flex", gap: 4, marginTop: mobile ? 8 : 10,
          background: "rgba(0,0,0,0.15)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderRadius: 10, padding: 3,
        }}>
          {tabs.map((tab) => {
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                style={{
                  flex: tab.label ? 1 : "none",
                  padding: mobile ? "5px 8px" : "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: T.font,
                  fontSize: mobile ? 11 : 12,
                  fontWeight: active ? 800 : 600,
                  background: active ? "rgba(255,255,255,0.92)" : "transparent",
                  color: active ? T.primaryDk : "rgba(255,255,255,.85)",
                  transition: "all .2s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                }}
              >
                <span style={{ fontSize: mobile ? 12 : 13 }}>{tab.icon}</span>
                {tab.label && <span>{tab.label}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
