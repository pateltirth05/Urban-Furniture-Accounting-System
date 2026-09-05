export default function ErrorState({ message = "Unable to load data.", onRetry }) {
  return (
    <div className="errorState">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btnSecondary" style={{ marginTop: 12 }}>
          Retry
        </button>
      )}
    </div>
  );
}
