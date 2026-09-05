export default function EmptyState({ message = "No records found." }) {
  return <div className="emptyState">{message}</div>;
}
