export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map(row =>
      row
        .map(cell =>
          cell.includes(',') || cell.includes('"')
            ? `"${cell.replace(/"/g, '""')}"`
            : cell
        )
        .join(',')
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
