"use client";

/**
 * Pagination Component
 *
 * Reusable pagination component with mobile and desktop views.
 * Supports page navigation, shows current page range, and handles ellipsis for large page counts.
 */

interface PaginationProps {
  /**
   * Current page number (1-indexed)
   */
  page: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Total number of items
   */
  total: number;

  /**
   * Number of items per page
   */
  limit: number;

  /**
   * Whether pagination is in loading state
   */
  isLoading?: boolean;

  /**
   * Callback when page changes
   */
  onPageChange: (page: number) => void;
}

const Pagination = ({
  page,
  totalPages,
  total,
  limit,
  isLoading = false,
  onPageChange,
}: PaginationProps) => {
  if (totalPages <= 1) {
    return null;
  }

  const handlePrevious = () => {
    if (page > 1 && !isLoading) {
      onPageChange(Math.max(1, page - 1));
    }
  };

  const handleNext = () => {
    if (page < totalPages && !isLoading) {
      onPageChange(Math.min(totalPages, page + 1));
    }
  };

  const handlePageClick = (pageNum: number) => {
    if (!isLoading && pageNum !== page) {
      onPageChange(pageNum);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900 sm:px-6">
      <div className="flex items-center justify-between">
        {/* Mobile pagination */}
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={handlePrevious}
            disabled={page === 1 || isLoading}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={page === totalPages || isLoading}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Next
          </button>
        </div>

        {/* Desktop pagination */}
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing{" "}
              <span className="font-medium">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-medium">
                {Math.min(page * limit, total)}
              </span>{" "}
              of <span className="font-medium">{total}</span> results
            </p>
          </div>
          <div>
            <nav
              className="isolate inline-flex -space-x-px rounded-md shadow-sm"
              aria-label="Pagination"
            >
              <button
                onClick={handlePrevious}
                disabled={page === 1 || isLoading}
                className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= page - 1 && pageNum <= page + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageClick(pageNum)}
                        disabled={isLoading}
                        className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium focus:z-20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                          pageNum === page
                            ? "z-10 border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-200"
                            : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (pageNum === page - 2 || pageNum === page + 2) {
                    return (
                      <span
                        key={pageNum}
                        className="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      >
                        ...
                      </span>
                    );
                  }
                  return null;
                }
              )}
              <button
                onClick={handleNext}
                disabled={page === totalPages || isLoading}
                className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
