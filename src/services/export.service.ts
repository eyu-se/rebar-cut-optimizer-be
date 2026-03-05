import * as XLSX from 'xlsx';

interface CutPiece {
    lengthMm: number;
    requirement?: {
        location?: string | null;
        diameterMm?: number;
    };
}

interface StockBar {
    id: string;
    diameterMm: number;
    totalLengthMm: number;
    remainingLengthMm: number;
    isScrap: boolean;
    cutPieces: CutPiece[];
}

export const generateExcelReport = (
    jobName: string,
    projectName: string | null | undefined,
    createdAt: Date | string,
    stockBars: StockBar[]
) => {
    const data: any[][] = [];

    // ── Section 1: Job Header ──────────────────────────────────────────────
    data.push(['Job Name:', jobName, '', '', 'Project:', projectName || '—', '', 'Date:', new Date(createdAt).toLocaleDateString()]);
    data.push([]); // blank row

    // ── Section 2: Overall Summary ────────────────────────────────────────
    const totalBars = stockBars.length;
    const totalScrap = stockBars.filter(b => b.isScrap).reduce((s, b) => s + b.remainingLengthMm, 0);
    const totalStock = stockBars.reduce((s, b) => s + b.totalLengthMm, 0);
    const wastePercent = totalStock > 0 ? ((totalScrap / totalStock) * 100) : 0;
    const efficiency = 100 - wastePercent;

    data.push(['Total Stock Bars Used', 'Total Scrap (mm)', 'Waste %', 'Efficiency %']);
    data.push([totalBars, Math.round(totalScrap), wastePercent.toFixed(2) + '%', efficiency.toFixed(2) + '%']);
    data.push([]); // blank row

    // ── Section 3: Per-Diameter Summary ───────────────────────────────────
    const diaMap = new Map<number, { bars: number; scrap: number; stock: number }>();
    stockBars.forEach(bar => {
        const entry = diaMap.get(bar.diameterMm) ?? { bars: 0, scrap: 0, stock: 0 };
        entry.bars += 1;
        entry.stock += bar.totalLengthMm;
        if (bar.isScrap) entry.scrap += bar.remainingLengthMm;
        diaMap.set(bar.diameterMm, entry);
    });

    data.push(['Diameter', 'Stock Bars Used', 'Total Scrap (mm)', 'Waste %']);
    Array.from(diaMap.entries())
        .sort((a, b) => a[0] - b[0])
        .forEach(([dia, d]) => {
            const w = d.stock > 0 ? ((d.scrap / d.stock) * 100) : 0;
            data.push([`${dia}mm`, d.bars, Math.round(d.scrap), w.toFixed(2) + '%']);
        });
    data.push([]); // blank row

    // ── Section 4: Grouped Cutting Patterns ───────────────────────────────
    // Group bars by diameter, then group cut pieces by (lengthMm) to count qty
    // Each CutPiece carries { lengthMm, requirement.location }

    Array.from(diaMap.keys())
        .sort((a, b) => a - b)
        .forEach(dia => {
            const barsForDia = stockBars.filter(b => b.diameterMm === dia);

            // Aggregate cuts for this diameter: key = lengthMm, value = [ { location, qty } ]
            const cutsByLength = new Map<number, Map<string, number>>();
            barsForDia.forEach(bar => {
                bar.cutPieces.forEach(piece => {
                    const loc = piece.requirement?.location ?? '—';
                    const locMap = cutsByLength.get(piece.lengthMm) ?? new Map<string, number>();
                    locMap.set(loc, (locMap.get(loc) ?? 0) + 1);
                    cutsByLength.set(piece.lengthMm, locMap);
                });
            });

            // Count total bars used and scrap for this dia group
            const { bars: dBars, scrap: dScrap } = diaMap.get(dia)!;

            // Title row for this diameter group
            data.push([`Ø${dia}mm`, `Bars Used: ${dBars}`, `Total Scrap: ${Math.round(dScrap)} mm`]);

            // Column header for detail rows
            data.push(['Cutting', 'Location']);

            // One detail row per unique (length, location) combination
            Array.from(cutsByLength.entries())
                .sort((a, b) => b[0] - a[0]) // longest cuts first
                .forEach(([lengthMm, locMap]) => {
                    Array.from(locMap.entries()).forEach(([loc, qty]) => {
                        const cutting = `${(lengthMm / 1000).toFixed(2)}m × ${qty}`;
                        data.push([cutting, loc]);
                    });
                });

            data.push([]); // blank row after each diameter group
        });

    // ── Build Workbook ─────────────────────────────────────────────────────
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Auto-column widths (rough estimation)
    const colWidths = data.reduce((acc: number[], row) => {
        row.forEach((cell, i) => {
            const len = String(cell ?? '').length;
            acc[i] = Math.max(acc[i] ?? 8, len + 2);
        });
        return acc;
    }, []);
    worksheet['!cols'] = colWidths.map(w => ({ wch: w }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fabrication Sheet');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};
