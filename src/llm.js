const { GoogleGenerativeAI } = require('@google/generative-ai');
const { LISTING_SCHEMA_PROMPT, FILTER_URLS_PROMPT } = require('./schema');

const MAX_RETRIES = 2;

let model = null;

function initLLM(apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

/**
 * Filter URLs to find real estate detail page links.
 */
async function filterDetailUrls(pageText, urls, logger, domain) {
    const input = `${FILTER_URLS_PROMPT}\n\nPage content (truncated):\n${pageText.substring(0, 15000)}\n\nURLs found on the page:\n${JSON.stringify(urls)}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await model.generateContent(input);
            const response = result.response.text().trim();

            const jsonStr = extractJson(response);
            const parsed = JSON.parse(jsonStr);

            if (!Array.isArray(parsed)) {
                throw new Error('Expected array of URLs');
            }
            return parsed.filter(url => typeof url === 'string' && url.startsWith('http'));
        } catch (err) {
            if (attempt < MAX_RETRIES) {
                logger.warn(domain, `LLM parsing failed. Gracefully retrying...`);
            } else {
                logger.error(domain, `LLM URL filtering failed after ${MAX_RETRIES + 1} attempts: ${err.message}`);
                return [];
            }
        }
    }
    return [];
}

/**
 * Extract structured listing data from a detail page.
 */
async function extractListingData(pageText, logger, domain) {
    const charCount = pageText.length;
    logger.info(domain, `Extracting real estate listing data with LLM. This may take a few seconds... (Character count: ${charCount})`);

    const input = `${LISTING_SCHEMA_PROMPT}\n\nPage content:\n${pageText.substring(0, 30000)}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await model.generateContent(input);
            const response = result.response.text().trim();

            const jsonStr = extractJson(response);
            const parsed = JSON.parse(jsonStr);

            if (!parsed || typeof parsed !== 'object' || !parsed.title) {
                throw new Error('Invalid response from LLM: missing required fields');
            }
            return parsed;
        } catch (err) {
            if (attempt < MAX_RETRIES) {
                logger.warn(domain, `LLM parsing failed. Gracefully retrying...`);
                logger.info(domain, `Extracting real estate listing data with LLM. This may take a few seconds... (Character count: ${charCount})`);
            } else {
                logger.error(domain, `LLM extraction failed after ${MAX_RETRIES + 1} attempts: ${err.message}`);
                return null;
            }
        }
    }
    return null;
}

/**
 * Extract JSON string from LLM response (may be wrapped in markdown code blocks).
 */
function extractJson(text) {
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
    }
    return text;
}

module.exports = { initLLM, filterDetailUrls, extractListingData };
