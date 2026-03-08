# Contributing to LLM Immo Scraper

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/LLMImmoScraper.git`
3. **Install dependencies**: `npm install && npx playwright install chromium`
4. **Create a branch**: `git checkout -b feature/my-feature`

## Development

```bash
cp .env.example .env   # Add your Gemini API key
npm start              # Run the scraper
npm run validate       # Validate output schema
```

## Adding Support for a New Site

1. **Test with input URLs** — Add search URLs from the new site to `input.txt` and run the scraper. The LLM-based approach often works out of the box.
2. **If customization is needed** — Add site-specific logic in `src/handlers/`. Use `search.js` and `detail.js` as reference.
3. **Update examples** — Add sample URLs to `examples/input.example.txt`.

## Pull Request Guidelines

- Keep PRs focused on a single change
- Add a clear description of what the PR does and why
- Make sure `npm run validate` passes on the output
- Follow the existing code style (CommonJS modules, JSDoc comments)

## Reporting Issues

When filing a bug, please include:

- The URL(s) you were trying to scrape
- The error output from `log.txt`
- Your Node.js version (`node --version`)

## Code of Conduct

Be respectful and constructive. We're all here to build something useful.
