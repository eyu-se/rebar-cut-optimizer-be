import * as XLSX from 'xlsx';
/**
 * Specialized parser for the user's specific BBS format.
 * location = Col B (Location) + Col C (Type)
 * diameterMm = Col D (Dia)
 * requiredLengthMm = Col E (Length) -> convert to mm
 * quantity = Col K (Total)
 */
export declare const processSpecializedBBS: (sheet: XLSX.WorkSheet) => Promise<{
    diameterMm: number;
    requiredLengthMm: number;
    quantity: number;
    location: string;
}[]>;
export declare const processExcelFile: (filePath: string) => Promise<{
    diameterMm: number;
    requiredLengthMm: number;
    quantity: number;
    location: any;
}[]>;
//# sourceMappingURL=excelProcessor.d.ts.map