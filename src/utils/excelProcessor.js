import * as XLSX from 'xlsx';
import fs from 'fs';
/**
 * Specialized parser for the user's specific BBS format.
 * location = Col B (Location) + Col C (Type)
 * diameterMm = Col D (Dia)
 * requiredLengthMm = Col E (Length) -> convert to mm
 * quantity = Col K (Total)
 */
export const processSpecializedBBS = async (sheet) => {
    const rows = XLSX.utils.sheet_to_json(sheet, { header: "A", defval: '' });
    // 1. Find the header row (searching for "Dia", "Length", etc. around row 13)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const row = rows[i];
        const combined = Object.values(row).join('|').toLowerCase();
        if (combined.includes('dia') && combined.includes('length') && combined.includes('total')) {
            headerRowIndex = i;
            break;
        }
    }
    if (headerRowIndex === -1) {
        // Fallback to row 12 (0-indexed) if not found, as user mentioned row 13
        headerRowIndex = 11;
    }
    const dataRows = rows.slice(headerRowIndex + 1);
    return dataRows.map(row => {
        const diameter = parseFloat(row['D']);
        let length = parseFloat(row['E']);
        let qty = parseFloat(row['K']);
        // Heuristic: If length is small (e.g., < 100), it's likely in meters -> convert to mm
        if (length > 0 && length < 100)
            length *= 1000;
        return {
            diameterMm: diameter,
            requiredLengthMm: Math.round(length),
            quantity: Math.round(qty),
            location: `${row['B']} ${row['C']}`.trim(),
        };
    }).filter(r => r.diameterMm > 0 && r.requiredLengthMm > 0 && r.quantity > 0);
};
export const processExcelFile = async (filePath) => {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName)
        throw new Error('No sheets found');
    const sheet = workbook.Sheets[sheetName];
    if (!sheet)
        throw new Error(`Sheet ${sheetName} not found`);
    // Try specialized parser first
    try {
        const specialized = await processSpecializedBBS(sheet);
        if (specialized.length > 0)
            return specialized;
    }
    catch (e) {
        console.warn('Specialized parsing failed, falling back to generic', e);
    }
    // Generic fallback
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return rows.map(row => ({
        diameterMm: Number(row['Diameter'] || row['diameter'] || 0),
        requiredLengthMm: Number(row['Length'] || row['length'] || row['requiredLength'] || 0),
        quantity: Number(row['Quantity'] || row['quantity'] || 1),
        location: row['Location'] || row['location'] || '',
    })).filter(r => r.diameterMm > 0 && r.requiredLengthMm > 0);
};
//# sourceMappingURL=excelProcessor.js.map