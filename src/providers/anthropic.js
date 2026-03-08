/**
 * Anthropic LLM provider.
 */
class AnthropicProvider {
    constructor(apiKey) {
        let Anthropic;
        try {
            Anthropic = require('@anthropic-ai/sdk');
        } catch {
            throw new Error(
                'Anthropic package not installed. Run: npm install @anthropic-ai/sdk'
            );
        }
        this.client = new Anthropic({ apiKey });
        this.name = 'anthropic';
    }

    async generateText(prompt) {
        const response = await this.client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }],
        });
        return response.content[0].text.trim();
    }
}

module.exports = AnthropicProvider;
