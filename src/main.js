require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { PlaywrightCrawler, Configuration } = require('crawlee');
const { initLLM } = require('./llm');
const { handleSearchPage } = require('./handlers/search');
const { handleDetailPage } = require('./handlers/detail');
const Logger = require('./logger');

// ── Configuration ────────────────────────────────────────────────────
const INPUT_FILE = path.join(__dirname, '..', 'input.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'output.txt');
const LOG_FILE = path.join(__dirname, '..', 'log.txt');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY environment variable is required.');
    console.error('Get a free key at: https://aistudio.google.com/app/apikey');
    process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
    const logger = new Logger(LOG_FILE);

    // Initialize LLM
    initLLM(GEMINI_API_KEY);

    // Read and parse input URLs
    const inputContent = fs.readFileSync(INPUT_FILE, 'utf-8');
    const urls = inputContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && line.startsWith('http'));

    if (urls.length === 0) {
        logger.error(null, 'No valid URLs found in input.txt');
        process.exit(1);
    }

    // Group URLs by domain
    const domainGroups = {};
    for (const url of urls) {
        const hostname = new URL(url).hostname;
        if (!domainGroups[hostname]) {
            domainGroups[hostname] = [];
        }
        domainGroups[hostname].push(url);
    }

    logger.info(null, `System info`, {
        nodeVersion: process.version,
        crawleeVersion: require('crawlee/package.json').version,
    });

    // Shared results array (all crawlers push to this)
    const allResults = [];




    // Launch one crawler per domain (in parallel, matching original behavior)
    const crawlerPromises = Object.entries(domainGroups).map(([domain, domainUrls]) => {
        return runDomainCrawler(domain, domainUrls, logger, allResults);
    });

    await Promise.all(crawlerPromises);

    // Write output
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2), 'utf-8');
    logger.info(null, `Scraping complete. ${allResults.length} listings written to output.txt`);
}

/**
 * Run a crawler for a single domain.
 */
async function runDomainCrawler(domain, urls, logger, results) {
    logger.info(domain, `Starting crawler for domain: ${domain} with ${urls.length} URLs`);

    const domainResults = [];
    const startTime = Date.now();
    let requestsFinished = 0;
    let requestsFailed = 0;

    // Create a per-domain configuration for isolated storage
    const config = new Configuration({
        persistStorage: false,
        storageClientOptions: {
            localDataDirectory: path.join(__dirname, '..', '.storage', domain),
        },
    });

    const crawler = new PlaywrightCrawler({
        launchContext: {
            launchOptions: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                ],
            },
        },
        preNavigationHooks: [
            async ({ page }) => {
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
                });
            },
        ],
        maxConcurrency: 3,
        maxRequestRetries: 2,
        requestHandlerTimeoutSecs: 120,
        navigationTimeoutSecs: 60,

        async requestHandler(context) {
            const { request, page } = context;
            const label = request.label || request.userData?.label;

            logger.info(domain, `Now processing URL: ${request.url}`);

            if (label === 'detail') {
                await handleDetailPage(context, logger, domain, domainResults);
            } else {
                await handleSearchPage({ ...context, crawler }, logger, domain);
            }
            requestsFinished++;
        },

        async failedRequestHandler({ request }, error) {
            requestsFailed++;
            logger.warn(domain, `Request failed: ${request.url} - ${error?.message || 'Unknown error'}`);
        },
    }, config);

    // Add initial search URLs
    await crawler.addRequests(
        urls.map(url => ({
            url,
            label: 'search',
            userData: { domain },
        }))
    );

    logger.info(domain, `Starting the crawler.`);
    await crawler.run();

    const runtimeMs = Date.now() - startTime;
    logger.info(domain, `Finished! Total ${requestsFinished + requestsFailed} requests: ${requestsFinished} succeeded, ${requestsFailed} failed.`);
    logger.info(domain, `Finished crawling domain: ${domain}`);

    logger.statistics(domain, {
        requestsFinished,
        requestsFailed,
        crawlerRuntimeMillis: runtimeMs,
    });

    // Merge domain results into global results
    results.push(...domainResults);
}

// ── Run ──────────────────────────────────────────────────────────────
main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
