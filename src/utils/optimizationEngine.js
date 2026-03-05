/**
 * First Fit Decreasing (FFD) Algorithm for Rebar Cutting Stock Problem.
 *
 * @param requirements List of rebar requirements (diameter, length, quantity)
 * @param stockLengthMm Standard stock length (e.g., 12000mm)
 * @param minOffcutToSaveMm Minimum length to consider as a reusable offcut instead of scrap
 */
export const ffdAlgorithm = (requirements, stockLengthMm = 12000, minOffcutToSaveMm = 500) => {
    // 1. Flatten requirements (quantity -> individual pieces)
    let piecesToCut = [];
    requirements.forEach(req => {
        for (let i = 0; i < req.quantity; i++) {
            piecesToCut.push({ id: req.id, length: req.requiredLengthMm, diameter: req.diameterMm });
        }
    });
    // 2. Group by diameter (each diameter is solved independently)
    const diameters = Array.from(new Set(piecesToCut.map(p => p.diameter)));
    const results = [];
    diameters.forEach(diameter => {
        const diameterPieces = piecesToCut
            .filter(p => p.diameter === diameter)
            .sort((a, b) => b.length - a.length); // Sort descending
        const stockBars = [];
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
        // 3. Local Search Refinement (Swap/Move pieces to minimize bars)
        const refinedBars = localSearchSwap(stockBars, minOffcutToSaveMm);
        results.push(...refinedBars);
    });
    return results;
};
/**
 * Local Search refinement to improve the FFD solution.
 * Focuses on moving pieces from sparsely populated bars to others
 * to reduce the total number of stock bars.
 */
export const localSearchSwap = (results, minOffcutToSaveMm = 500) => {
    let improved = true;
    let currentResults = JSON.parse(JSON.stringify(results));
    let iterations = 0;
    while (improved && iterations < 100) {
        improved = false;
        iterations++;
        // Sort by remaining length descending (try to empty the bars with most space)
        currentResults.sort((a, b) => b.remainingLengthMm - a.remainingLengthMm);
        for (let i = 0; i < currentResults.length; i++) {
            const barFrom = currentResults[i];
            for (let j = currentResults.length - 1; j > i; j--) {
                const barTo = currentResults[j];
                // Try to move each piece from barFrom to barTo
                for (let k = 0; k < barFrom.pieces.length; k++) {
                    const piece = barFrom.pieces[k];
                    if (barTo.remainingLengthMm >= piece.lengthMm) {
                        // Move piece
                        barTo.pieces.push(piece);
                        barTo.remainingLengthMm -= piece.lengthMm;
                        barFrom.pieces.splice(k, 1);
                        barFrom.remainingLengthMm += piece.lengthMm;
                        improved = true;
                        break;
                    }
                }
                if (improved)
                    break;
            }
            // If barFrom is empty, remove it
            if (barFrom.pieces.length === 0) {
                currentResults.splice(i, 1);
                improved = true;
                break;
            }
            if (improved)
                break;
        }
    }
    // Recalculate isScrap
    currentResults.forEach(bar => {
        bar.isScrap = bar.remainingLengthMm < minOffcutToSaveMm;
    });
    return currentResults;
};
//# sourceMappingURL=optimizationEngine.js.map