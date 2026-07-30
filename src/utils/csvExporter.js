/**
 * Client-Side CSV Export Utility
 * 
 * Takes an array of objects, maps them using custom headers,
 * formats fields, and triggers a browser file download.
 * 
 * @param {Array<Object>} data - The source JSON array to convert.
 * @param {Object} headersMap - Key-to-Label map. Example: { email: 'User Email', role: 'Account Role' }
 * @param {string} filename - Target filename. Example: 'payments_log.csv'
 */
export function exportToCSV(data, headersMap, filename = 'export.csv') {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const keys = Object.keys(headersMap);
  const headers = Object.values(headersMap);

  // Helper: Escape CSV string literals safely
  const escapeCSVValue = (val) => {
    if (val === null || val === undefined) return '';
    let stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
    
    // Replace newlines with spaces
    stringVal = stringVal.replace(/(\r\n|\n|\r)/gm, ' ');
    
    // If value contains quotes, commas, or semicolons, escape and wrap in quotes
    if (stringVal.includes('"') || stringVal.includes(',') || stringVal.includes(';')) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  };

  // Compile CSV content
  const csvRows = [];
  
  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const rowValues = keys.map((key) => {
      const val = row[key];
      return escapeCSVValue(val);
    });
    csvRows.push(rowValues.join(','));
  }

  const csvString = csvRows.join('\n');

  // Trigger download via Blob URL
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
