# 🏠 LLM Immo Scraper

**AI-powered real estate scraper** that crawls property listing sites and extracts structured data using Google's Gemini LLM.

Point it at search result pages from supported Austrian real estate portals, and it will automatically discover individual listings, extract detailed property information, and output clean, structured JSON.

---

## ✨ Features

- **LLM-Powered Extraction** — Uses Gemini 2.0 Flash to intelligently parse listing pages instead of brittle CSS selectors
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

### Add Search URLs

Create an `input.txt` file in the project root with one search URL per line:

```
https://www.willhaben.at/iad/immobilien/haus-kaufen/haus-angebote?areaId=900&rows=30&PRICE_TO=500000
https://www.immobilienscout24.at/regional/1220/haus-kaufen?primaryPriceTo=500000
```

See [`examples/input.example.txt`](examples/input.example.txt) for a full example.

### Run

```bash
npm start
```

Results are written to `output.txt` as a JSON array. Logs go to `log.txt` and stdout.

### Validate Output

```bash
npm run validate
```

---

## 🔍 How It Works

```
input.txt (search URLs)
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
    output.txt (JSON)
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
    ├── main.js           # Entry point — orchestrates crawlers
    ├── llm.js            # Gemini API integration (URL filtering + data extraction)
    ├── logger.js         # File + stdout logger
    ├── schema.js         # LLM prompts and JSON schema definitions
    ├── validate.js       # Output schema validator
    └── handlers/
        ├── search.js     # Search results page handler
        └── detail.js     # Property detail page handler
```

---

## ⚙️ Configuration

| Variable        | Required | Description                          |
|-----------------|----------|--------------------------------------|
| `GEMINI_API_KEY` | ✅       | Google Gemini API key                |

Crawling parameters (concurrency, timeouts, retries) can be adjusted in [`src/main.js`](src/main.js).

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📜 License

[MIT](LICENSE) © LLMImmoScraper Contributors
