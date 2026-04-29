import { processExcelFile } from './excelProcessor.js';
import { ffdAlgorithm } from './optimizationEngine.js';

const filePath = '/Users/eyu/Documents/Workstation/project_initiatives/with_bele/Rebar Cut Optimizer/rebar cut need - test.xlsx';

async function verify() {
    try {
        console.log('--- Verifying Simplified BBS Parser ---');
        console.log('File:', filePath);

        const results = await processExcelFile(filePath);

        console.log(`Extracted Count: ${results.length}`);
        if (results.length > 0) {
            console.log('--- First 5 Items ---');
            console.log(JSON.stringify(results.slice(0, 5), null, 2));

            console.log('\n--- Testing Optimization Engine ---');
            // Adding dummy IDs for the engine test
            const testData = results.slice(0, 20).map((r, i) => ({ ...r, id: `test-${i}` }));
            const optimizationResults = ffdAlgorithm(testData, 12000, 500);
            console.log(`✅ Success! Optimization produced ${optimizationResults.length} stock bars.`);
            console.log('Sample Stock Bar:', JSON.stringify(optimizationResults[0], null, 2));
        } else {
            console.log('No data extracted.');
        }
        console.log('--- Verification Complete ---');
    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verify();
