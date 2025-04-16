import OpenAI from 'openai';

// 翻译模式模板
const translationPrompts = {
    general: {
        name: '通用翻译',
        prompt: '请将以下文本从{sourceLanguage}翻译成{targetLanguage}，保持原文的意思和语气:\n\n{text}'
    },
    academic: {
        name: '学术翻译',
        prompt: '请将以下学术文本从{sourceLanguage}翻译成{targetLanguage}，保持专业术语的准确性和学术风格:\n\n{text}'
    },
    literary: {
        name: '文学翻译',
        prompt: '请将以下文学文本从{sourceLanguage}翻译成{targetLanguage}，注重保留原文的文学风格、修辞和情感:\n\n{text}'
    },
    technical: {
        name: '技术翻译',
        prompt: '请将以下技术文档从{sourceLanguage}翻译成{targetLanguage}，确保技术术语的准确性和一致性:\n\n{text}'
    },
    simplified: {
        name: '简化翻译',
        prompt: '请将以下文本从{sourceLanguage}翻译成{targetLanguage}，使用简单易懂的语言，避免复杂表达:\n\n{text}'
    }
};

// 支持的模型配置
const modelConfigs = {
    zhipu: {
        name: '智谱',
        models: [
            { id: 'glm-4-flash', name: 'glm-4-flash' }
        ],
        baseURL: 'http://218.192.106.250:9090/v1',
        createClient: (apiKey) => new OpenAI({
            apiKey: apiKey,
            baseURL: 'http://218.192.106.250:9090/v1',
            dangerouslyAllowBrowser: true  // 添加此选项允许在浏览器环境中使用
        }),
        translate: async (client, model, prompt) => {
            const response = await client.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            });
            return response.choices[0].message.content;
        }
    },
    doubao: {
        name: '豆包',
        models: [
            { id: 'Doubao-pro-128k', name: '豆包 128K' }
        ],
        baseURL: 'http://218.192.106.250:9090/v1',
        createClient: (apiKey) => new OpenAI({
            apiKey: apiKey,
            baseURL: 'http://218.192.106.250:9090/v1',
            dangerouslyAllowBrowser: true  // 添加此选项允许在浏览器环境中使用
        }),
        translate: async (client, model, prompt) => {
            const response = await client.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            });
            return response.choices[0].message.content;
        }
    },
    deepseek: {
        name: 'DeepSeek',
        models: [
            { id: 'deepseek-chat', name: 'DeepSeek Chat' },
            { id: 'deepseek-coder', name: 'DeepSeek Coder' }
        ],
        baseURL: 'http://api.deepseek.com/v1/chat/completions', // 假设的API地址
        headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }),
        buildPayload: (model, prompt) => ({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
        }),
        extractResponse: (response) => response.data.choices[0].message.content
    },
    kimi: {
        name: 'Kimi',
        models: [
            { id: 'kimi-chat', name: 'Kimi Chat' },
            { id: 'kimi-pro', name: 'Kimi Pro' }
        ],
        baseURL: 'http://api.moonshot.cn/v1/chat/completions', // 假设的API地址
        headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }),
        buildPayload: (model, prompt) => ({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
        }),
        extractResponse: (response) => response.data.choices[0].message.content
    },
    openai: {
        name: 'OpenAI',
        models: [
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
            { id: 'gpt-4', name: 'GPT-4' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
        ],
        baseURL: 'http://218.192.106.250:9090/v1',
        createClient: (apiKey) => new OpenAI({
            apiKey: apiKey,
            baseURL: 'http://218.192.106.250:9090/v1',
            dangerouslyAllowBrowser: true  // 添加此选项允许在浏览器环境中使用
        }),
        translate: async (client, model, prompt) => {
            const response = await client.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            });
            return response.choices[0].message.content;
        }
    },
};

// 获取所有支持的翻译模式
export const getTranslationModes = () => {
    return Object.entries(translationPrompts).map(([key, value]) => ({
        key,
        name: value.name
    }));
};

// 获取所有支持的服务提供商
export const getProviders = () => {
    return Object.entries(modelConfigs).map(([key, value]) => ({
        key,
        name: value.name
    }));
};

// 获取指定提供商的模型列表
export const getModels = (provider) => {
    return modelConfigs[provider]?.models || [];
};

// 翻译函数
export const translate = async ({
    text,
    sourceLanguage = '自动识别',
    targetLanguage,
    provider,
    model,
    mode = 'general',
    apiKey
}) => {
    if (!text || !targetLanguage || !provider || !model || !apiKey) {
        throw new Error('缺少必要参数');
    }

    const providerConfig = modelConfigs[provider];
    if (!providerConfig) {
        throw new Error(`不支持的服务提供商: ${provider}`);
    }

    const promptTemplate = translationPrompts[mode]?.prompt || translationPrompts.general.prompt;
    const prompt = promptTemplate
        .replace('{sourceLanguage}', sourceLanguage)
        .replace('{targetLanguage}', targetLanguage)
        .replace('{text}', text);

    try {
        // 保存API密钥到本地存储
        window.utools.dbStorage.setItem(`${provider}_api_key`, apiKey);

        // 创建对应提供商的客户端
        const client = providerConfig.createClient(apiKey);

        // 调用翻译方法
        return await providerConfig.translate(client, model, prompt);
    } catch (error) {
        console.error('翻译请求失败:', error);
        throw new Error(`翻译失败: ${error.message || '未知错误'}`);
    }
};

// 获取保存的API密钥
export const getSavedApiKey = (provider) => {
    return window.utools.dbStorage.getItem(`${provider}_api_key`) || '';
};

// 检测语言（简单实现，实际可能需要更复杂的逻辑或调用专门的API）
export const detectLanguage = (text) => {
    // 简单的语言检测逻辑
    const hasChineseChar = /[\u4e00-\u9fa5]/.test(text);
    const hasJapaneseChar = /[\u3040-\u30ff]/.test(text);
    const hasKoreanChar = /[\uac00-\ud7a3]/.test(text);

    if (hasChineseChar) return '中文';
    if (hasJapaneseChar) return '日语';
    if (hasKoreanChar) return '韩语';

    // 默认假设是英语
    return '英语';
};

export default {
    getTranslationModes,
    getProviders,
    getModels,
    translate,
    getSavedApiKey,
    detectLanguage
};