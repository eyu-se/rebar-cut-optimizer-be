/**
 * Process an uploaded Excel or CSV file and return an array of rebar requirements.
 * Each requirement includes: diameterMm, requiredLengthMm, quantity, location.
 */
export declare const processExcelFile: (filePath: string) => Promise<{
    diameterMm: number;
    requiredLengthMm: number;
    quantity: number;
    location: any;
}[]>;
//# sourceMappingURL=excelProcessor.d.ts.map