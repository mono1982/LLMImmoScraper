const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini LLM provider.
 */
class GeminiProvider {
    constructor(apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        this.name = 'gemini';
    }

    async generateText(prompt) {
        const result = await this.model.generateContent(prompt);
        return result.response.text().trim();
    }
}

module.exports = GeminiProvider;
