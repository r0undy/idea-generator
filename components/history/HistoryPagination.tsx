/**
 * HistoryPagination
 *
 * Thin wrapper around the shared Pagination component, bound to the /history
 * route. Kept as a named component so the history page's import is unchanged.
 */

import Pagination from "@/components/ui/Pagination";

export interface HistoryPaginationProps {
  currentPage: number;
  totalPages: number;
}

export default function HistoryPagination({
  currentPage,
  totalPages,
}: HistoryPaginationProps) {
  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      basePath="/history"
      ariaLabel="Pull history pages"
    />
  );
}
