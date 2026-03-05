import * as XLSX from 'xlsx';
import * as fs from 'fs';
XLSX.set_fs(fs);
/**
 * Process an uploaded Excel or CSV file and return an array of rebar requirements.
 * Each requirement includes: diameterMm, requiredLengthMm, quantity, location.
 */
export const processExcelFile = async (filePath) => {
    // Read the file as a buffer
    const fileBuffer = fs.readFileSync(filePath);
    // Parse the workbook (supports .xlsx, .xls, .csv)
    const workbook = XLSX.read(fileBuffer);
    // Assume the first sheet contains the data
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error('No sheets found in Excel file');
    }
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        throw new Error(`Sheet ${sheetName} not found`);
    }
    // Convert sheet to JSON rows
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    // Map rows to the required shape; adjust column names as needed
    // Assuming columns: Diameter / diameter, Length / length / requiredLength, Quantity / quantity, Location / location
    return rows.map(row => ({
        diameterMm: Number(row['Diameter'] || row['diameter'] || 0),
        requiredLengthMm: Number(row['Length'] || row['length'] || row['requiredLength'] || 0),
        quantity: Number(row['Quantity'] || row['quantity'] || 1), // Default to 1 if not specified
        location: row['Location'] || row['location'] || '',
    })).filter(r => r.diameterMm > 0 && r.requiredLengthMm > 0); // Filter out empty or invalid rows
};
//# sourceMappingURL=excelProcessor.js.map