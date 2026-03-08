const { filterDetailUrls } = require('../llm');

/**
 * Handle a search results page: extract listing URLs and enqueue them.
 * @param {object} context - Crawlee request handler context
 * @param {object} logger - Logger instance
 * @param {string} domain - Domain name for logging
 */
async function handleSearchPage({ page, request, enqueueLinks, crawler }, logger, domain) {
    logger.info(domain, `Parsing search results page.`);

    // Wait for the page content to load (SPAs like willhaben lazy-render listings)
    await page.waitForLoadState('networkidle').catch(() => { });

    // Scroll down to trigger lazy-loaded listings
    await autoScroll(page);

    // Small delay for any final renders
    await page.waitForTimeout(1000);

    // Get all links from the page
    const allLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
            .map(a => a.href)
            .filter(href => href && href.startsWith('http'));
    });

    // Remove duplicates
    const uniqueLinks = [...new Set(allLinks)];

    // Get page text for context
    const pageText = await page.evaluate(() => document.body.innerText);

    const charCount = pageText.length;
    logger.info(domain, `Filtering URLs with LLM. This may take a few seconds... (Character count: ${charCount})`);

    // Use LLM to filter to only listing detail URLs
    const detailUrls = await filterDetailUrls(pageText, uniqueLinks, logger, domain);

    if (detailUrls.length > 0) {
        // Enqueue detail page URLs
        for (const url of detailUrls) {
            await crawler.addRequests([{
                url,
                label: 'detail',
                userData: { domain }
            }]);
        }
        logger.info(domain, `Enqueued ${detailUrls.length} detail page URLs for crawling.`);
    } else {
        logger.warn(domain, `No detail page URLs found on search results page.`);
    }
}

/**
 * Scroll down the page gradually to trigger lazy-loading of listings.
 */
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 500;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200);

            // Safety timeout after 10 seconds
            setTimeout(() => {
                clearInterval(timer);
                resolve();
            }, 10000);
        });
    });
}

module.exports = { handleSearchPage };
