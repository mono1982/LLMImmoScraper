# 🏠 LLM Immo Scraper

**AI-powered real estate scraper** that crawls property listing sites and extracts structured data using LLMs (Gemini, OpenAI, or Anthropic — auto-detected from your API key).

Point it at search result pages from supported Austrian real estate portals, and it will automatically discover individual listings, extract detailed property information, and output clean, structured JSON.

---

## ✨ Features

- **Agent-Friendly CLI** — Pass URLs as args, get JSON on stdout. Pipe-friendly, zero config
- **Multi-LLM Support** — Works with Gemini, OpenAI, and Anthropic. Auto-detects from env vars, or pick with `--provider`
- **LLM-Powered Extraction** — Intelligently parses listing pages instead of brittle CSS selectors
- **Multi-Site Support** — Crawls multiple real estate portals in parallel (willhaben.at, immobilienscout24.at, etc.)
- **Smart URL Discovery** — LLM filters search result links to find actual property detail pages
- **Structured Output** — Produces consistent JSON with address, price, features, and metadata
- **Resilient Crawling** — Built on [Crawlee](https://crawlee.dev/) + Playwright with retries, concurrency control, and anti-detection

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- A **Google Gemini API key** — [get one free](https://aistudio.google.com/app/apikey)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/LLMImmoScraper.git
cd LLMImmoScraper
npm install
npx playwright install chromium
```

### Configuration

```bash
cp .env.example .env
# Edit .env and add your Gemini API key
```

### Run

```bash
# Pass URLs directly — JSON output on stdout
node src/main.js "https://www.willhaben.at/iad/immobilien/haus-kaufen/..." "https://www.immoscout24.at/..."

# Or use the legacy file mode (reads input.txt, writes output.txt)
npm start
```

---

## 🤖 CLI Usage

Designed to be called by other tools, scripts, and AI agents.

```
Usage: llm-immo-scraper [options] [urls...]

Arguments:
  urls                    Search result URLs to scrape

Options:
  -o, --output <file>     Write JSON to file instead of stdout
  -l, --log <file>        Write logs to file (in addition to stderr)
  -q, --quiet             Suppress log output
  -h, --help              Show help
```

### Examples

```bash
# Scrape and pipe to jq
node src/main.js "https://willhaben.at/..." 2>/dev/null | jq '.[].title'

# Save results to a file
node src/main.js "https://willhaben.at/..." -o results.json

# Multiple sites in one call
node src/main.js "https://willhaben.at/..." "https://immoscout24.at/..." | jq length

# Quiet mode (no logs at all)
node src/main.js -q "https://willhaben.at/..." > results.json

# Install globally, then call as a command
npm link
llm-immo-scraper "https://willhaben.at/..."
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0`  | Success |
| `1`  | Configuration error (missing API key, no URLs) |
| `2`  | Scraping completed but no results extracted |

### Validate Output

```bash
npm run validate
```

---

## 🔍 How It Works

```
  CLI args / input.txt
        │
        ▼
┌───────────────────┐
│  Crawlee/Playwright│  ← One crawler per domain, in parallel
│  loads search page │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Gemini LLM       │  ← Filters page links → detail URLs only
│  URL filtering     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Crawlee/Playwright│  ← Navigates to each listing
│  loads detail page │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Gemini LLM       │  ← Extracts structured property data
│  data extraction   │
└────────┬──────────┘
         │
         ▼
  stdout / output.txt
```

---

## 📄 Output Schema

Each listing in the output JSON has this structure:

```json
{
  "title": "Einfamilienhaus in ruhiger Lage",
  "propertyType": "house",
  "address": {
    "postalCode": "1220",
    "countryCode": "AT",
    "addressString": "1220 Wien, Donaustadt"
  },
  "monetaryDetails": {
    "transactionType": "sale",
    "purchasingPrice": 899000,
    "purchasingPricePerM2": 5350.50,
    "rent": null,
    "rentPerM2": null,
    "currencyCode": "EUR",
    "isCommissionFree": false
  },
  "features": {
    "livingArea": 168,
    "plotArea": 520,
    "yearBuilt": 2005,
    "bedrooms": 4,
    "bathrooms": 2,
    "floor": 2,
    "hasGarage": true,
    "hasGarden": true,
    "hasPool": false
  },
  "url": "https://www.willhaben.at/iad/immobilien/d/haus-kaufen/...",
  "snapshotDate": "2026-03-08T19:30:00.000Z"
}
```

See [`examples/output.example.json`](examples/output.example.json) for a full sample.

---

## 📁 Project Structure

```
LLMImmoScraper/
├── .env.example          # Environment variable template
├── .gitignore
├── CONTRIBUTING.md       # Contribution guidelines
├── LICENSE               # MIT License
├── README.md
├── examples/
│   ├── input.example.txt   # Sample input URLs
│   └── output.example.json # Sample output data
├── package.json
└── src/
    ├── main.js           # CLI entry point — arg parsing, dual-mode orchestration
    ├── llm.js            # Provider-agnostic LLM interface
    ├── logger.js         # Dual-output logger (stderr + optional file)
    ├── schema.js         # LLM prompts and JSON schema definitions
    ├── validate.js       # Output schema validator
    ├── handlers/
    │   ├── search.js     # Search results page handler
    │   └── detail.js     # Property detail page handler
    └── providers/
        ├── gemini.js     # Google Gemini (gemini-2.0-flash)
        ├── openai.js     # OpenAI (gpt-4o-mini)
        └── anthropic.js  # Anthropic (claude-sonnet-4-20250514)
```

---

## ⚙️ Configuration

| Variable          | Required | Description                                  |
|-------------------|----------|----------------------------------------------|
| `GEMINI_API_KEY`    | one of   | Google Gemini — [get key](https://aistudio.google.com/app/apikey) |
| `OPENAI_API_KEY`    | one of   | OpenAI — [get key](https://platform.openai.com/api-keys) |
| `ANTHROPIC_API_KEY` | one of   | Anthropic — [get key](https://console.anthropic.com/settings/keys) |

Set at least one API key. The first one found is used. Override with `--provider`.

Crawling parameters (concurrency, timeouts, retries) can be adjusted in [`src/main.js`](src/main.js).

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📜 License

[MIT](LICENSE) © LLMImmoScraper Contributors
