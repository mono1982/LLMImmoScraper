/**
 * OpenAI LLM provider.
 */
class OpenAIProvider {
    constructor(apiKey) {
        let OpenAI;
        try {
            OpenAI = require('openai');
        } catch {
            throw new Error(
                'OpenAI package not installed. Run: npm install openai'
            );
        }
        this.client = new OpenAI({ apiKey });
        this.name = 'openai';
    }

    async generateText(prompt) {
        const response = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
        });
        return response.choices[0].message.content.trim();
    }
}

module.exports = OpenAIProvider;
