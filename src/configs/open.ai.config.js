const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const openaiConfig = {
    model: process.env.OPENAI_MODEL,
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE),
    topP: parseFloat(process.env.OPENAI_TOP_P),
    frequencyPenalty: parseFloat(process.env.OPENAI_FREQUENCY_PENALTY),
    presencePenalty: parseFloat(process.env.OPENAI_PRESENCE_PENALTY),
    retryAttempts: 3,
    timeout: 60000
};

const validateConnection = async () => {
    try {
        const response = await openai.chat.completions.create({
            model: openaiConfig.model,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10
        });

        if (response) {
            console.log('OpenAI API Connected Successfully');
            console.log(`Model: ${openaiConfig.model}`);
            return true;
        }
    } catch (error) {
        console.error('OpenAI API Connection Error:', error.message);
        if (error.status === 401) {
            console.error('Invalid API Key - Check OPENAI_API_KEY');
        }
        if (error.status === 429) {
            console.error('Rate Limit Exceeded - Check API Usage');
        }
        return false;
    }
};

const getModelInfo = () => {
    return {
        provider: 'OpenAI',
        model: openaiConfig.model,
        maxTokens: openaiConfig.maxTokens,
        temperature: openaiConfig.temperature,
        topP: openaiConfig.topP
    };
};

const listAvailableModels = async () => {
    try {
        const models = await openai.models.list();
        console.log('Available OpenAI Models:', models.data.map(m => m.id).join(', '));
        return models.data;
    } catch (error) {
        console.error('Error Fetching Models:', error.message);
        return [];
    }
};

validateConnection();

module.exports = {
    openai,
    openaiConfig,
    validateConnection,
    getModelInfo,
    listAvailableModels
};