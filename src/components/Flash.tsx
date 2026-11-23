export function Flash({ msg, err }: { msg?: string | string[]; err?: string | string[] }) {
  const m = Array.isArray(msg) ? msg[0] : msg;
  const e = Array.isArray(err) ? err[0] : err;
  if (!m && !e) return null;
  return (
    <div className={`notice ${e ? "err" : "ok"}`} role={e ? "alert" : "status"} style={{ marginBottom: 16 }}>
      {e || m}
    </div>
  );
}
