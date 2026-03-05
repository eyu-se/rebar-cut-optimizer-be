export interface Requirement {
    id: string;
    diameterMm: number;
    requiredLengthMm: number;
    quantity: number;
}

export interface CutResult {
    stockBarId: string;
    diameterMm: number;
    totalLengthMm: number;
    pieces: {
        requirementId: string;
        lengthMm: number;
    }[];
    remainingLengthMm: number;
    isScrap: boolean;
}

/**
 * First Fit Decreasing (FFD) Algorithm for Rebar Cutting Stock Problem.
 * 
 * @param requirements List of rebar requirements (diameter, length, quantity)
 * @param stockLengthMm Standard stock length (e.g., 12000mm)
 * @param minOffcutToSaveMm Minimum length to consider as a reusable offcut instead of scrap
 */
export const ffdAlgorithm = (
    requirements: Requirement[],
    stockLengthMm: number = 12000,
    minOffcutToSaveMm: number = 500
): CutResult[] => {
    // 1. Flatten requirements (quantity -> individual pieces)
    let piecesToCut: { id: string; length: number; diameter: number }[] = [];
    requirements.forEach(req => {
        for (let i = 0; i < req.quantity; i++) {
            piecesToCut.push({ id: req.id, length: req.requiredLengthMm, diameter: req.diameterMm });
        }
    });

    // 2. Group by diameter (each diameter is solved independently)
    const diameters = Array.from(new Set(piecesToCut.map(p => p.diameter)));
    const results: CutResult[] = [];

    diameters.forEach(diameter => {
        const diameterPieces = piecesToCut
            .filter(p => p.diameter === diameter)
            .sort((a, b) => b.length - a.length); // Sort descending

        const stockBars: CutResult[] = [];

        diameterPieces.forEach(piece => {
            // Try to fit in existing stock bars
            let fitted = false;
            for (const bar of stockBars) {
                if (bar.remainingLengthMm >= piece.length) {
                    bar.pieces.push({ requirementId: piece.id, lengthMm: piece.length });
                    bar.remainingLengthMm -= piece.length;
                    fitted = true;
                    break;
                }
            }

            // If it doesn't fit, open a new stock bar
            if (!fitted) {
                stockBars.push({
                    stockBarId: crypto.randomUUID(),
                    diameterMm: diameter,
                    totalLengthMm: stockLengthMm,
                    pieces: [{ requirementId: piece.id, lengthMm: piece.length }],
                    remainingLengthMm: stockLengthMm - piece.length,
                    isScrap: false, // Will be determined after all pieces are placed
                });
            }
        });

        // Determine if remaining length is scrap or offcut
        stockBars.forEach(bar => {
            bar.isScrap = bar.remainingLengthMm < minOffcutToSaveMm;
        });

        results.push(...stockBars);
    });

    return results;
};
