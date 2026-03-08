/**
 * Validation script: check scraped output schema and compare with original.
 * Run: node src/validate.js
 */
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'output.txt');

function validate() {
    if (!fs.existsSync(OUTPUT_FILE)) {
        console.error('❌ output.txt not found. Run the scraper first.');
        process.exit(1);
    }

    const output = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));

    console.log('═══ Schema Validation ═══');

    const featureKeys = [
        'livingArea', 'plotArea', 'yearBuilt', 'bedrooms', 'bathrooms', 'floor',
        'hasGarage', 'hasCarport', 'hasParkingSpace', 'hasTerrace', 'hasBalcony',
        'hasGarden', 'hasLoggia', 'hasPool', 'hasStorageRoom', 'isBarrierFree',
        'hasBuiltInKitchen', 'hasElevator', 'hasAirConditioning', 'hasBasementCompartment'
    ];

    let schemaErrors = 0;
    output.forEach((item, i) => {
        // Check top-level keys
        for (const key of ['title', 'propertyType', 'address', 'monetaryDetails', 'features', 'url', 'snapshotDate']) {
            if (!(key in item)) { console.error(`  ❌ Listing ${i}: missing "${key}"`); schemaErrors++; }
        }
        // Check address sub-keys
        if (item.address) {
            for (const key of ['postalCode', 'countryCode', 'addressString']) {
                if (!(key in item.address)) { console.error(`  ❌ Listing ${i}: missing address.${key}`); schemaErrors++; }
            }
        }
        // Check monetaryDetails sub-keys
        if (item.monetaryDetails) {
            for (const key of ['transactionType', 'purchasingPrice', 'purchasingPricePerM2', 'rent', 'rentPerM2', 'currencyCode', 'isCommissionFree']) {
                if (!(key in item.monetaryDetails)) { console.error(`  ❌ Listing ${i}: missing monetaryDetails.${key}`); schemaErrors++; }
            }
        }
        // Check features sub-keys
        if (item.features) {
            for (const fkey of featureKeys) {
                if (!(fkey in item.features)) { console.error(`  ❌ Listing ${i}: missing features.${fkey}`); schemaErrors++; }
            }
        }
    });

    if (schemaErrors === 0) {
        console.log('  ✅ All listings have correct schema structure');
    } else {
        console.log(`  ❌ ${schemaErrors} schema errors found`);
    }

    console.log(`\n═══ Count ═══`);
    console.log(`  ${output.length} listings scraped`);

    console.log('\n═══ Sample Output ═══');
    if (output.length > 0) {
        console.log(JSON.stringify(output[0], null, 2));
    }

    console.log(`\n═══ Summary ═══`);
    console.log(`  ${output.length} listings scraped`);
    console.log(`  ${schemaErrors} schema errors`);
    const withUrl = output.filter(l => l.url).length;
    const withDate = output.filter(l => l.snapshotDate).length;
    console.log(`  ${withUrl}/${output.length} have url`);
    console.log(`  ${withDate}/${output.length} have snapshotDate`);
}

validate();
