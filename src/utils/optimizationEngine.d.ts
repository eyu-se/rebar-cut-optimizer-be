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
export declare const ffdAlgorithm: (requirements: Requirement[], stockLengthMm?: number, minOffcutToSaveMm?: number) => CutResult[];
/**
 * Local Search refinement to improve the FFD solution.
 * Focuses on moving pieces from sparsely populated bars to others
 * to reduce the total number of stock bars.
 */
export declare const localSearchSwap: (results: CutResult[], minOffcutToSaveMm?: number) => CutResult[];
//# sourceMappingURL=optimizationEngine.d.ts.map