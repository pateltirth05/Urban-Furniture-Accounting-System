export default function LoadingState({ message = "Loading data..." }) {
  return <div className="loadingState">{message}</div>;
}
