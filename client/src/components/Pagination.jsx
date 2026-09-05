export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.total === 0) return null;
  const { page, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="pagination">
      <div className="pageInfo">
        Showing page {page} of {totalPages} ({total} total records)
      </div>
      <div className="pageButtons">
        <button
          className="btnSecondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          className="btnSecondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
