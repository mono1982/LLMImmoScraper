const { extractListingData } = require('../llm');

/**
 * Handle a detail listing page: extract structured data via LLM.
 * @param {object} context - Crawlee request handler context
 * @param {object} logger - Logger instance
 * @param {string} domain - Domain name for logging
 * @param {Array} results - Shared results array to push extracted data into
 */
async function handleDetailPage({ page, request }, logger, domain, results) {
    logger.info(domain, `Parsing detail page.`);

    // Extract main content text (trying to get meaningful content, not nav/footer)
    const pageText = await page.evaluate(() => {
        const clone = document.body.cloneNode(true);
        const remove = clone.querySelectorAll('script, style, nav, footer, header, iframe, noscript');
        remove.forEach(el => el.remove());
        return clone.innerText;
    });

    const data = await extractListingData(pageText, logger, domain);

    if (data) {
        // Attach url and snapshotDate
        data.url = request.url;
        data.snapshotDate = new Date().toISOString();
        results.push(data);
        logger.info(domain, `Successfully parsed and stored data`);
    } else {
        logger.warn(domain, `Failed to extract data from: ${request.url}`);
    }
}

module.exports = { handleDetailPage };
