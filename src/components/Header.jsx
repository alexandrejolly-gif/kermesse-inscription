import { T, useResponsive } from "../styles/theme";

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
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
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
        </div>

        {/* Bouton admin en haut à droite */}
        <button
          onClick={() => setView(view === "admin" ? "inscription" : "admin")}
          style={{
            background: view === "admin" ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.15)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "none",
            borderRadius: 10,
            padding: mobile ? "6px 8px" : "8px 10px",
            cursor: "pointer",
            color: view === "admin" ? T.primaryDk : "#fff",
            fontSize: mobile ? 16 : 18,
            lineHeight: 1,
            transition: "all .2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginLeft: 12,
          }}
          title={view === "admin" ? "Retour" : "Administration"}
        >
          {view === "admin" ? "✕" : "⚙️"}
        </button>
      </div>
    </div>
  );
}
