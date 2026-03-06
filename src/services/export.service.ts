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
    // Group identical stock bars based on their exact cutting pattern
    // A bar's pattern is its sorted combination of (length, location, qty)

    const diaMapBars = new Map<number, StockBar[]>();
    stockBars.forEach(bar => {
        if (!diaMapBars.has(bar.diameterMm)) {
            diaMapBars.set(bar.diameterMm, []);
        }
        diaMapBars.get(bar.diameterMm)!.push(bar);
    });

    Array.from(diaMapBars.keys())
        .sort((a, b) => a - b)
        .forEach(dia => {
            const barsForDia = diaMapBars.get(dia)!;

            // Group bars by their exact cutting signature
            const patternGroups = new Map<string, { bars: StockBar[], cuts: any[] }>();

            barsForDia.forEach(bar => {
                // Determine cuts for this single bar
                const cutGroups = new Map<string, { lengthMm: number; loc: string; qty: number }>();
                bar.cutPieces.forEach(piece => {
                    const loc = piece.requirement?.location || '—';
                    const key = `${piece.lengthMm}_${loc}`;
                    if (!cutGroups.has(key)) {
                        cutGroups.set(key, { lengthMm: piece.lengthMm, loc, qty: 0 });
                    }
                    cutGroups.get(key)!.qty += 1;
                });

                // Sort cuts to create a consistent signature
                const sortedCuts = Array.from(cutGroups.values()).sort((a, b) => {
                    if (b.lengthMm !== a.lengthMm) return b.lengthMm - a.lengthMm;
                    return a.loc.localeCompare(b.loc);
                });

                const signature = sortedCuts.map(c => `${c.lengthMm}_${c.loc}_${c.qty}`).join('|');

                if (!patternGroups.has(signature)) {
                    patternGroups.set(signature, { bars: [], cuts: sortedCuts });
                }
                patternGroups.get(signature)!.bars.push(bar);
            });

            // Iterate over the pattern groups for this diameter
            Array.from(patternGroups.values())
                .sort((a, b) => b.bars.length - a.bars.length) // Most frequent patterns first
                .forEach(group => {
                    const barsCount = group.bars.length;
                    const totalScrap = group.bars.reduce((sum, bar) => sum + (bar.isScrap ? bar.remainingLengthMm : 0), 0);

                    // Pattern Header
                    data.push([
                        `${dia}mm`,
                        `Bars used : ${barsCount}`,
                        `Total Scrap : ${Math.round(totalScrap)} mm`
                    ]);

                    // Pattern Columns
                    data.push(['Cutting', 'Location']);

                    // Pattern Details
                    group.cuts.forEach(cut => {
                        const lengthM = cut.lengthMm / 1000;
                        const lengthStr = Number.isInteger(lengthM) ? `${lengthM}m` : `${lengthM.toFixed(2)}m`;
                        data.push([`${lengthStr} * ${cut.qty}`, cut.loc]);
                    });

                    data.push([]); // blank row after each pattern group
                });
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
