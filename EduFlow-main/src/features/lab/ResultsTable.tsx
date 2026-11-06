import type { QueryResult } from "./types";

function Cell({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="italic text-muted-foreground">NULL</span>;
  }
  return <>{value instanceof Date ? value.toISOString().slice(0, 10) : String(value)}</>;
}

export function ResultsTable({ result }: { result: QueryResult }) {
  if (result.rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Query ran successfully but returned no rows.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/60">
            {result.columns.map((c) => (
              <th
                key={c}
                className="whitespace-nowrap px-3 py-2 font-mono text-xs font-semibold text-muted-foreground"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} className="border-b border-border/60 last:border-b-0">
              {result.columns.map((c) => (
                <td key={c} className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                  <Cell value={row[c]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {result.truncated && (
        <div className="border-t border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
          Showing the first 500 rows.
        </div>
      )}
    </div>
  );
}
