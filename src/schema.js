/**
 * The JSON schema for extracting real estate listing data.
 * This schema matches the output format from the original scraper.
 */
const LISTING_SCHEMA = {
    type: "object",
    properties: {
        "address.postalCode": {
            type: ["string", "null"],
            description: "Postal code of the property address, e.g. '1220'"
        },
        "monetaryDetails.purchasingPrice": {
            type: ["number", "null"],
            description: "Purchase price in EUR as a number (no currency symbol). null if not specified or only available on request."
        },
        features: {
            type: "object",
            properties: {
                livingArea: { type: ["number", "null"], description: "Living area in square meters" },
                plotArea: { type: ["number", "null"], description: "Plot/land area in square meters" },
                yearBuilt: { type: ["number", "null"], description: "Year the property was built" },
                bedrooms: { type: ["number", "null"], description: "Number of bedrooms" },
                bathrooms: { type: ["number", "null"], description: "Number of bathrooms" },
                floor: { type: ["number", "null"], description: "Number of floors/stories" },
                hasGarage: { type: ["boolean", "null"], description: "Whether the property has a garage" },
                hasCarport: { type: ["boolean", "null"], description: "Whether the property has a carport" },
                hasParkingSpace: { type: ["boolean", "null"], description: "Whether the property has parking spaces" },
                hasTerrace: { type: ["boolean", "null"], description: "Whether the property has a terrace" },
                hasBalcony: { type: ["boolean", "null"], description: "Whether the property has a balcony" },
                hasGarden: { type: ["boolean", "null"], description: "Whether the property has a garden" },
                hasLoggia: { type: ["boolean", "null"], description: "Whether the property has a loggia" },
                hasPool: { type: ["boolean", "null"], description: "Whether the property has a pool" },
                hasStorageRoom: { type: ["boolean", "null"], description: "Whether the property has a storage room" },
                isBarrierFree: { type: ["boolean", "null"], description: "Whether the property is barrier-free/accessible" },
                hasBuiltInKitchen: { type: ["boolean", "null"], description: "Whether the property has a built-in kitchen" },
                hasElevator: { type: ["boolean", "null"], description: "Whether the property has an elevator" },
                hasAirConditioning: { type: ["boolean", "null"], description: "Whether the property has air conditioning" },
                hasBasementCompartment: { type: ["boolean", "null"], description: "Whether the property has a basement/cellar" }
            }
        },
        title: {
            type: "string",
            description: "The listing title/headline"
        }
    }
};

const LISTING_SCHEMA_PROMPT = `Extract the following information from this real estate listing page.
Return ONLY valid JSON matching this exact structure (no markdown, no code blocks, no explanation):

{
  "title": "<listing title>",
  "propertyType": "<'house', 'apartment', 'flat', 'land', 'commercial', or 'other'>",
  "address": {
    "postalCode": "<string or null - postal code like '1220'>",
    "countryCode": "<string - ISO country code, e.g. 'AT'>",
    "addressString": "<string or null - full address as shown, e.g. '1220 Wien, Donaustadt'>"
  },
  "monetaryDetails": {
    "transactionType": "<'sale' or 'rent'>",
    "purchasingPrice": <number or null - purchase price in EUR>,
    "purchasingPricePerM2": <number or null - price per m² if available, or calculate from price/livingArea>,
    "rent": <number or null - monthly rent if rental>,
    "rentPerM2": <number or null - rent per m²>,
    "currencyCode": "EUR",
    "isCommissionFree": <true/false/null - whether commission-free (provisionsfrei)>
  },
  "features": {
    "livingArea": <number or null - in m²>,
    "plotArea": <number or null - in m²>,
    "yearBuilt": <number or null>,
    "bedrooms": <number or null>,
    "bathrooms": <number or null>,
    "floor": <number or null - total floors/stories>,
    "hasGarage": <true/false/null>,
    "hasCarport": <true/false/null>,
    "hasParkingSpace": <true/false/null>,
    "hasTerrace": <true/false/null>,
    "hasBalcony": <true/false/null>,
    "hasGarden": <true/false/null>,
    "hasLoggia": <true/false/null>,
    "hasPool": <true/false/null>,
    "hasStorageRoom": <true/false/null>,
    "isBarrierFree": <true/false/null>,
    "hasBuiltInKitchen": <true/false/null>,
    "hasElevator": <true/false/null>,
    "hasAirConditioning": <true/false/null>,
    "hasBasementCompartment": <true/false/null>
  }
}

Rules:
- Use null for any information not found on the page
- For boolean features: true if explicitly mentioned as available, false if explicitly stated as not available, null if not mentioned
- Price should be a plain number (e.g., 899000 not "€899.000")
- Living area and plot area in square meters as numbers
- Postal code as a string (e.g., "1220")
- purchasingPricePerM2: if not stated, calculate as purchasingPrice / livingArea (rounded to 2 decimals). null if either is missing.
- propertyType: infer from the listing (Haus=house, Wohnung=apartment/flat, Grundstück=land)
- addressString: combine district, city, area info as displayed (e.g. "1220 Wien, Donaustadt")
- isCommissionFree: look for "provisionsfrei" or similar terms`;

const FILTER_URLS_PROMPT = `You are analyzing a real estate search results page. Given the page content and a list of URLs found on the page, identify which URLs are links to individual property listing detail pages.

Rules:
- Only include URLs that point to individual property listings (houses, apartments, flats)
- Exclude navigation links, category links, search filter links, advertisement links, login/registration links
- Exclude pagination links
- Exclude links to other search results or listing overview pages
- Return ONLY a JSON array of the qualifying URLs, nothing else (no markdown, no code blocks, no explanation)

Example output: ["https://example.com/listing/123", "https://example.com/listing/456"]`;

module.exports = { LISTING_SCHEMA, LISTING_SCHEMA_PROMPT, FILTER_URLS_PROMPT };
