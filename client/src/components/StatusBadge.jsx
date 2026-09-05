export default function StatusBadge({ status }) {
  if (!status) return null;
  const s = status.toUpperCase();

  let className = "statusBadge statusDraft";
  if (s === "CONFIRMED") className = "statusBadge statusConfirmed";
  if (s === "PAID" || s === "POSTED" || s === "BILLED" || s === "INVOICED") className = "statusBadge statusPaid";
  if (s === "PARTIALLY_PAID") className = "statusBadge statusPartiallyPaid";
  if (s === "CANCELLED") className = "statusBadge statusCancelled";

  return <span className={className}>{status}</span>;
}
