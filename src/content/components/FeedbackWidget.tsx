import { useState } from "react";

interface FeedbackWidgetProps {
  onClose: () => void;
}

export default function FeedbackWidget({ onClose }: FeedbackWidgetProps) {
  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | "other">("feature");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: "SUBMIT_FEEDBACK",
        feedbackType,
        message: message.trim(),
        url: window.location.href,
      });

      if (response?.success) {
        setResult("success");
        setMessage("");
        setTimeout(() => onClose(), 1500);
      } else {
        setResult("error");
      }
    } catch {
      setResult("error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#12121f",
        borderRadius: "16px 16px 0 0",
        borderTop: "1px solid #2a2a40",
        padding: "16px",
        zIndex: 10,
        boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>Send Feedback</span>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "14px", padding: "0 2px", lineHeight: 1 }}
        >
          {"\u2715"}
        </button>
      </div>

      {/* Type dropdown */}
      <select
        value={feedbackType}
        onChange={(e) => setFeedbackType(e.target.value as "bug" | "feature" | "other")}
        style={{
          width: "100%",
          padding: "8px 10px",
          backgroundColor: "#1a1a2e",
          border: "1px solid #2a2a40",
          borderRadius: "8px",
          color: "#e2e8f0",
          fontSize: "12px",
          marginBottom: "8px",
          outline: "none",
          cursor: "pointer",
          appearance: "auto" as React.CSSProperties["appearance"],
        }}
      >
        <option value="feature">Feature Request</option>
        <option value="bug">Bug Report</option>
        <option value="other">Other</option>
      </select>

      {/* Message textarea */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Tell us what's on your mind..."
        style={{
          width: "100%",
          minHeight: "80px",
          padding: "8px 10px",
          backgroundColor: "#1a1a2e",
          border: "1px solid #2a2a40",
          borderRadius: "8px",
          color: "#e2e8f0",
          fontSize: "12px",
          resize: "vertical",
          outline: "none",
          fontFamily: "inherit",
          lineHeight: "1.5",
          boxSizing: "border-box",
        }}
      />

      {/* Submit + status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
        <span style={{ fontSize: "11px", color: result === "success" ? "#22c55e" : result === "error" ? "#f87171" : "transparent" }}>
          {result === "success" ? "Thanks for your feedback!" : result === "error" ? "Failed to send. Try again." : "."}
        </span>
        <button
          onClick={handleSubmit}
          disabled={sending || !message.trim()}
          style={{
            padding: "6px 16px",
            backgroundColor: sending || !message.trim() ? "#2a2a40" : "#00d4ff",
            color: sending || !message.trim() ? "#64748b" : "#0a0a14",
            border: "none",
            borderRadius: "8px",
            cursor: sending || !message.trim() ? "default" : "pointer",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          {sending ? "Sending..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
