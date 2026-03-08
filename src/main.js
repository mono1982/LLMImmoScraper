#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { PlaywrightCrawler, Configuration } = require('crawlee');
const { initLLM } = require('./llm');
const { handleSearchPage } = require('./handlers/search');
const { handleDetailPage } = require('./handlers/detail');
const Logger = require('./logger');

// ── CLI Argument Parsing ─────────────────────────────────────────────
function parseArgs(argv) {
    const args = argv.slice(2);
    const opts = {
        urls: [],
        outputFile: null,
        logFile: null,
        provider: null,
        quiet: false,
        help: false,
    };

    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        if (arg === '-h' || arg === '--help') {
            opts.help = true;
        } else if (arg === '-q' || arg === '--quiet') {
            opts.quiet = true;
        } else if ((arg === '-o' || arg === '--output') && i + 1 < args.length) {
            opts.outputFile = args[++i];
        } else if ((arg === '-l' || arg === '--log') && i + 1 < args.length) {
            opts.logFile = args[++i];
        } else if ((arg === '-p' || arg === '--provider') && i + 1 < args.length) {
            opts.provider = args[++i];
        } else if (arg.startsWith('http')) {
            opts.urls.push(arg);
        } else if (!arg.startsWith('-')) {
            // Try treating non-flag args as URLs
            opts.urls.push(arg);
        }
        i++;
    }

    return opts;
}

function printHelp() {
    const help = `
Usage: llm-immo-scraper [options] [urls...]

  AI-powered real estate scraper. Supports Gemini, OpenAI, and Anthropic.

Arguments:
  urls                      Search result URLs to scrape (space-separated)

Options:
  -p, --provider <name>     LLM provider: gemini, openai, anthropic (auto-detected from env)
  -o, --output <file>       Write JSON output to file instead of stdout
  -l, --log <file>          Write logs to file in addition to stderr
  -q, --quiet               Suppress log output
  -h, --help                Show this help message

Modes:
  CLI mode (urls given):    Logs -> stderr, JSON -> stdout (pipe-friendly)
  File mode (no urls):      Reads input.txt, writes output.txt, logs to log.txt

Examples:
  # Scrape with auto-detected provider
  llm-immo-scraper "https://willhaben.at/..."

  # Force a specific provider
  llm-immo-scraper --provider openai "https://willhaben.at/..."

  # Pipe JSON output
  llm-immo-scraper "https://willhaben.at/..." 2>/dev/null | jq '.[].title'

  # Legacy file mode (reads input.txt)
  llm-immo-scraper

Environment (first key found is used):
  GEMINI_API_KEY            Google Gemini  — https://aistudio.google.com/app/apikey
  OPENAI_API_KEY            OpenAI         — https://platform.openai.com/api-keys
  ANTHROPIC_API_KEY         Anthropic      — https://console.anthropic.com/settings/keys
`.trimStart();
    process.stderr.write(help);
}

// ── Configuration ────────────────────────────────────────────────────
const INPUT_FILE = path.join(process.cwd(), 'input.txt');
const OUTPUT_FILE = path.join(process.cwd(), 'output.txt');
const LOG_FILE = path.join(process.cwd(), 'log.txt');

// ── Provider Resolution ──────────────────────────────────────────────
const GeminiProvider = require('./providers/gemini');
const OpenAIProvider = require('./providers/openai');
const AnthropicProvider = require('./providers/anthropic');

const PROVIDERS = {
    gemini: { envKey: 'GEMINI_API_KEY', Provider: GeminiProvider },
    openai: { envKey: 'OPENAI_API_KEY', Provider: OpenAIProvider },
    anthropic: { envKey: 'ANTHROPIC_API_KEY', Provider: AnthropicProvider },
};

function resolveProvider(requested) {
    // If explicitly requested, use that provider
    if (requested) {
        const entry = PROVIDERS[requested];
        if (!entry) {
            process.stderr.write(`ERROR: Unknown provider "${requested}". Choose: ${Object.keys(PROVIDERS).join(', ')}\n`);
            process.exit(1);
        }
        const apiKey = process.env[entry.envKey];
        if (!apiKey) {
            process.stderr.write(`ERROR: ${entry.envKey} environment variable is required for --provider ${requested}\n`);
            process.exit(1);
        }
        return new entry.Provider(apiKey);
    }

    // Auto-detect: first key found wins
    for (const [name, { envKey, Provider }] of Object.entries(PROVIDERS)) {
        const apiKey = process.env[envKey];
        if (apiKey) {
            return new Provider(apiKey);
        }
    }

    process.stderr.write('ERROR: No LLM API key found. Set one of:\n');
    process.stderr.write('  GEMINI_API_KEY    — https://aistudio.google.com/app/apikey\n');
    process.stderr.write('  OPENAI_API_KEY    — https://platform.openai.com/api-keys\n');
    process.stderr.write('  ANTHROPIC_API_KEY — https://console.anthropic.com/settings/keys\n');
    process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
    const opts = parseArgs(process.argv);

    if (opts.help) {
        printHelp();
        process.exit(0);
    }

    // Determine mode
    const cliMode = opts.urls.length > 0;

    // Configure logger
    let logFile;
    if (opts.logFile) {
        logFile = opts.logFile;
    } else if (!cliMode) {
        logFile = LOG_FILE;
    } else {
        logFile = null; // CLI mode: stderr only
    }
    const logger = new Logger({ logFile, quiet: opts.quiet });

    // Resolve and initialize LLM provider
    const provider = resolveProvider(opts.provider);
    logger.info(null, `Using LLM provider: ${provider.name}`);
    initLLM(provider);

    // Resolve input URLs
    let urls;
    if (cliMode) {
        urls = opts.urls;
        logger.info(null, `CLI mode: ${urls.length} URL(s) provided as arguments`);
    } else {
        if (!fs.existsSync(INPUT_FILE)) {
            process.stderr.write('ERROR: No URLs provided and input.txt not found.\n');
            process.stderr.write('Usage: llm-immo-scraper [urls...] or create input.txt\n');
            process.exit(1);
        }
        const inputContent = fs.readFileSync(INPUT_FILE, 'utf-8');
        urls = inputContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && line.startsWith('http'));
        logger.info(null, `File mode: ${urls.length} URL(s) read from input.txt`);
    }

    if (urls.length === 0) {
        logger.error(null, 'No valid URLs to scrape');
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

    // Launch one crawler per domain (in parallel)
    const crawlerPromises = Object.entries(domainGroups).map(([domain, domainUrls]) => {
        return runDomainCrawler(domain, domainUrls, logger, allResults);
    });

    await Promise.all(crawlerPromises);

    // Output results
    const jsonOutput = JSON.stringify(allResults, null, 2);

    const outputFile = opts.outputFile || (!cliMode ? OUTPUT_FILE : null);
    if (outputFile) {
        fs.writeFileSync(outputFile, jsonOutput, 'utf-8');
        logger.info(null, `${allResults.length} listings written to ${outputFile}`);
    }

    if (cliMode && !opts.outputFile) {
        // CLI mode without explicit output file: write JSON to stdout
        process.stdout.write(jsonOutput + '\n');
    }

    logger.info(null, `Scraping complete. ${allResults.length} listings extracted.`);

    if (allResults.length === 0) {
        process.exit(2);
    }
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
            localDataDirectory: path.join(process.cwd(), '.storage', domain),
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
    process.stderr.write(`Fatal error: ${err.message}\n`);
    process.exit(1);
});
