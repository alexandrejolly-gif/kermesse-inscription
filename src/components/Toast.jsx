import { useEffect } from "react";
import { T } from "../styles/theme";

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);

  const isErr = message.includes("❌");

  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      background: isErr ? "#FEF2F2" : "#F0FDF4",
      color: isErr ? "#991B1B" : "#065F46",
      border: `1.5px solid ${isErr ? "#FCA5A5" : "#6EE7B7"}`,
      borderRadius: 12, padding: "10px 20px",
      fontWeight: 700, fontSize: 13, maxWidth: "90vw",
      boxShadow: "0 8px 30px rgba(0,0,0,.12)",
      zIndex: 999, animation: "slideUp .3s ease",
      fontFamily: T.font, textAlign: "center",
    }}>
      {message}
    </div>
  );
}
