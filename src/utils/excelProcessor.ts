import * as XLSX from 'xlsx';
import fs from 'fs';

/**
 * Specialized parser for the user's simplified BBS format.
 * - Col A: Location Name
 * - Col B: Diameter (mm)
 * - Col C: Length (meters) -> convert to mm
 * - Col D: Quantity
 * - Data starts from Row 2
 */
export const processSpecializedBBS = async (sheet: XLSX.WorkSheet) => {
    // header: "A" maps JSON keys to column letters
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: "A", defval: '' });

    const results = [];

    // Data starts from row 2 (index 1)
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        const location = String(row['A'] || '').trim();
        const diameter = parseFloat(String(row['B']));
        let length = parseFloat(String(row['C']));
        let qty = parseFloat(String(row['D']));

        // Validate that we have numeric data for diameter and length
        if (!isNaN(diameter) && !isNaN(length) && diameter > 0 && length > 0) {
            // Convert length from meters to mm
            const lengthMm = Math.round(length * 1000);

            // Quantity must be > 0. If it's missing or NaN, we skip.
            if (!isNaN(qty) && qty > 0) {
                results.push({
                    diameterMm: diameter,
                    requiredLengthMm: lengthMm,
                    quantity: Math.round(qty),
                    location: location,
                });
            }
        }
    }

    return results;
};

export const processExcelFile = async (filePath: string) => {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('No sheets found');
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`Sheet ${sheetName} not found`);

    // Try specialized parser first
    try {
        const specialized = await processSpecializedBBS(sheet);
        if (specialized.length > 0) return specialized;
    } catch (e) {
        console.warn('Specialized parsing failed, falling back to generic', e);
    }

    // Generic fallback
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return rows.map(row => ({
        diameterMm: Number(row['Diameter'] || row['diameter'] || 0),
        requiredLengthMm: Number(row['Length'] || row['length'] || row['requiredLength'] || 0),
        quantity: Number(row['Quantity'] || row['quantity'] || 1),
        location: row['Location'] || row['location'] || '',
    })).filter(r => r.diameterMm > 0 && r.requiredLengthMm > 0);
};
