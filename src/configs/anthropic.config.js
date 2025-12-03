const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const anthropicConfig = {
    model: process.env.ANTHROPIC_MODEL,
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS),
    temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE),
    apiVersion: '2023-06-01',
    retryAttempts: 3,
    timeout: 60000
};

const validateConnection = async () => {
    try {
        const response = await anthropic.messages.create({
            model: anthropicConfig.model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'test' }]
        });

        if (response) {
            console.log('Anthropic API Connected Successfully');
            console.log(`Model: ${anthropicConfig.model}`);
            return true;
        }
    } catch (error) {
        console.error('Anthropic API Connection Error:', error.message);
        if (error.status === 401) {
            console.error('Invalid API Key - Check ANTHROPIC_API_KEY');
        }
        return false;
    }
};

const getModelInfo = () => {
    return {
        provider: 'Anthropic',
        model: anthropicConfig.model,
        maxTokens: anthropicConfig.maxTokens,
        temperature: anthropicConfig.temperature
    };
};

validateConnection();

module.exports = {
    anthropic,
    anthropicConfig,
    validateConnection,
    getModelInfo
};