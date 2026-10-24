/**
 * Utility to export an array of objects to a CSV file.
 * Includes UTF-8 BOM (\uFEFF) to ensure correct Arabic rendering in Excel,
 * and sanitizes cells against CSV Formula Injection (OWASP).
 */
export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) {
    return;
  }

  const separator = ',';
  const keys = Object.keys(rows[0]);
  
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map((row) => {
        return keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            if (typeof cell === 'string') {
              // Prevent CSV formula injection (=, +, -, @, tab, CR)
              if (/^[=+\-@\t\r]/.test(cell)) {
                cell = `'${cell}`;
              }
              cell = cell.replace(/"/g, '""');
              if (cell.search(/("|,|\n|\r)/g) >= 0) {
                cell = `"${cell}"`;
              }
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  // \uFEFF is the Byte Order Mark (BOM) for UTF-8
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
