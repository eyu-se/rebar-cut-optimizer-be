import * as XLSX from 'xlsx';
export const generateExcelReport = (jobName, stockBars) => {
    const data = [];
    // Header for the report
    data.push(['Fabrication Report', '', '', '']);
    data.push(['Job Name:', jobName]);
    data.push(['Date:', new Date().toLocaleDateString()]);
    data.push([]); // empty row
    data.push(['Bar ID', 'Diameter (mm)', 'Stock Length (mm)', 'Cut Pieces (mm)', 'Remaining (mm)', 'Status']);
    stockBars.forEach((bar, index) => {
        const pieceLengths = bar.cutPieces.map((p) => p.lengthMm).join(', ');
        data.push([
            index + 1,
            bar.diameterMm,
            bar.totalLengthMm,
            pieceLengths,
            bar.remainingLengthMm,
            bar.isScrap ? 'Scrap' : 'Offcut'
        ]);
    });
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fabrication Sheet');
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
};
//# sourceMappingURL=export.service.js.map