/**
 * HistoryPagination
 *
 * Prev/next + page-number pagination for the history list, driven entirely
 * by the `?page=` query param so it works via plain `<Link>` navigation (no
 * client JS required, matching the rest of the history view's Server
 * Component approach). Requirement 6.2's most-recent-first ordering is
 * unaffected: pagination only slices the already-ordered result set.
 *
 * Mobile-first: prev/next are the primary >=44px tap targets; a compact
 * page-number strip sits between them and truncates with an ellipsis once
 * there are more than a handful of pages, so it never wraps awkwardly on a
 * narrow screen.
 */

import Link from "next/link";

export interface HistoryPaginationProps {
  currentPage: number;
  totalPages: number;
}

/** Builds the small set of page numbers to render, with `null` standing in for an ellipsis. */
function buildPageList(currentPage: number, totalPages: number): (number | null)[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage - 1 > 1) pages.add(currentPage - 1);
  if (currentPage + 1 < totalPages) pages.add(currentPage + 1);

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const withGaps: (number | null)[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      withGaps.push(null);
    }
    withGaps.push(page);
  });
  return withGaps;
}

function pageHref(page: number): string {
  return page <= 1 ? "/history" : `/history?page=${page}`;
}

export default function HistoryPagination({
  currentPage,
  totalPages,
}: HistoryPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = buildPageList(currentPage, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Pull history pages"
      className="flex w-full items-center justify-between gap-2"
    >
      {hasPrev ? (
        <Link
          href={pageHref(currentPage - 1)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-foreground/15 bg-white/5 px-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-white/10 active:bg-white/15"
          aria-label="Previous page"
        >
          Prev
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-foreground/30"
        >
          Prev
        </span>
      )}

      <ul className="flex items-center gap-1">
        {pages.map((page, index) =>
          page === null ? (
            <li
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className="px-1 text-sm text-foreground/40"
            >
              &#8230;
            </li>
          ) : (
            <li key={page}>
              <Link
                href={pageHref(page)}
                aria-current={page === currentPage ? "page" : undefined}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors ${
                  page === currentPage
                    ? "bg-brand/20 text-brand"
                    : "text-foreground/70 hover:bg-white/10"
                }`}
              >
                {page}
              </Link>
            </li>
          ),
        )}
      </ul>

      {hasNext ? (
        <Link
          href={pageHref(currentPage + 1)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-foreground/15 bg-white/5 px-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-white/10 active:bg-white/15"
          aria-label="Next page"
        >
          Next
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-foreground/30"
        >
          Next
        </span>
      )}
    </nav>
  );
}
