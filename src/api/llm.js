import OpenAI from 'openai';
import zhipuApiRequest from "./llm_call.js";
import { systemPrompt, translationPrompts } from "./prompt.js";

// 支持的模型配置
const modelConfigs = {
    zhipu: {
        name: '智谱',
        models: [
            { id: 'GLM-4-Flash-250414', name: 'glm-4-flash' }
        ],
        createClient: (apiKey) => apiKey,
        translate: async (client, model, prompt) => {
            return await zhipuApiRequest(client, model, systemPrompt, prompt);
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
    // 自定义模型配置存储
    custom: {}
};

// 保存自定义模型配置到uTools数据库
const saveCustomConfigs = () => {
    // 创建一个不包含函数的配置副本
    const serializableConfigs = {};

    Object.keys(modelConfigs.custom).forEach(key => {
        const config = modelConfigs.custom[key];
        serializableConfigs[key] = {
            name: config.name,
            models: config.models,
            baseURL: config.baseURL
            // 不包含函数属性
        };
    });

    // 保存可序列化的配置
    window.utools.dbStorage.setItem('custom_model_configs', serializableConfigs);
};

// 从uTools数据库加载自定义模型配置
const loadCustomConfigs = () => {
    const savedConfigs = window.utools.dbStorage.getItem('custom_model_configs');
    if (savedConfigs) {
        // 为每个加载的配置添加函数
        Object.keys(savedConfigs).forEach(key => {
            const config = savedConfigs[key];
            modelConfigs.custom[key] = {
                ...config,
                createClient: (apiKey) => new OpenAI({
                    apiKey: apiKey,
                    baseURL: config.baseURL,
                    dangerouslyAllowBrowser: true
                }),
                translate: async (client, model, prompt) => {
                    const response = await client.chat.completions.create({
                        model: model,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.3,
                    });
                    return response.choices[0].message.content;
                }
            };
        });
    }
};

// 自定义提示模板存储
let customPrompts = {};

// 从uTools数据库加载自定义提示模板
const loadCustomPrompts = () => {
    const savedPrompts = window.utools.dbStorage.getItem('custom_prompts');
    if (savedPrompts) {
        customPrompts = savedPrompts;
    }
};

// 保存自定义提示模板到uTools数据库
const saveCustomPrompts = () => {
    window.utools.dbStorage.setItem('custom_prompts', customPrompts);
};

// 获取自定义提示模板
export const getCustomPrompts = () => {
    return customPrompts;
};

// 初始化加载自定义配置
loadCustomConfigs();
loadCustomPrompts();

// 获取所有支持的翻译模式
export const getTranslationModes = () => {
    // 合并默认翻译模式和自定义翻译模式
    const customPrompts = getCustomPrompts();
    const allPrompts = { ...translationPrompts, ...customPrompts };

    return Object.entries(allPrompts).map(([key, value]) => ({
        key,
        name: value.name
    }));
};

// 获取所有支持的服务提供商
export const getProviders = () => {
    // 获取自定义提供商
    const customProviders = Object.keys(modelConfigs.custom).map(key => ({
        key: `custom_${key}`,
        name: modelConfigs.custom[key].name || `自定义(${key})`
    }));

    // 合并默认提供商和自定义提供商
    const defaultProviders = Object.entries(modelConfigs)
        .filter(([key]) => key !== 'custom')
        .map(([key, value]) => ({
            key,
            name: value.name
        }));

    return [...defaultProviders, ...customProviders];
};

// 获取指定提供商的模型列表
export const getModels = (provider) => {
    // 处理自定义提供商
    if (provider.startsWith('custom_')) {
        const customKey = provider.replace('custom_', '');
        return modelConfigs.custom[customKey]?.models || [];
    }
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

    // 处理自定义提供商
    let providerConfig;
    if (provider.startsWith('custom_')) {
        const customKey = provider.replace('custom_', '');
        providerConfig = modelConfigs.custom[customKey];
    } else {
        providerConfig = modelConfigs[provider];
    }

    if (!providerConfig) {
        throw new Error(`不支持的服务提供商: ${provider}`);
    }

    // 获取提示模板，支持自定义提示
    const customPrompts = getCustomPrompts();
    const allPrompts = { ...translationPrompts, ...customPrompts };
    const promptTemplate = allPrompts[mode]?.prompt || allPrompts.general.prompt;

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

// 添加自定义模型配置
export const addCustomModelConfig = (name, baseURL, models) => {
    const key = Date.now().toString(); // 使用时间戳作为唯一标识

    modelConfigs.custom[key] = {
        name: name,
        models: models.map(model => ({ id: model.id, name: model.name })),
        baseURL: baseURL,
        createClient: (apiKey) => new OpenAI({
            apiKey: apiKey,
            baseURL: baseURL,
            dangerouslyAllowBrowser: true
        }),
        translate: async (client, model, prompt) => {
            const response = await client.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            });
            return response.choices[0].message.content;
        }
    };

    // 保存自定义配置到本地存储
    saveCustomConfigs();

    return `custom_${key}`;
};

// 删除自定义模型配置
export const removeCustomModelConfig = (customKey) => {
    if (!customKey.startsWith('custom_')) return false;

    const key = customKey.replace('custom_', '');
    if (modelConfigs.custom[key]) {
        delete modelConfigs.custom[key];
        saveCustomConfigs();
        return true;
    }
    return false;
};

// 添加自定义提示模板
export const addCustomPrompt = (key, name, promptTemplate) => {
    if (translationPrompts[key]) {
        throw new Error(`提示模板键名 "${key}" 已存在`);
    }

    customPrompts[key] = {
        name: name,
        prompt: promptTemplate
    };

    saveCustomPrompts();
    return key;
};

// 删除自定义提示模板
export const removeCustomPrompt = (key) => {
    if (customPrompts[key]) {
        delete customPrompts[key];
        saveCustomPrompts();
        return true;
    }
    return false;
};

// 更新自定义提示模板
export const updateCustomPrompt = (key, name, promptTemplate) => {
    if (!customPrompts[key]) {
        throw new Error(`提示模板 "${key}" 不存在`);
    }

    customPrompts[key] = {
        name: name,
        prompt: promptTemplate
    };

    saveCustomPrompts();
    return key;
};

export default {
    getTranslationModes,
    getProviders,
    getModels,
    translate,
    getSavedApiKey,
    detectLanguage,
    addCustomModelConfig,
    removeCustomModelConfig,
    addCustomPrompt,
    removeCustomPrompt,
    getCustomPrompts
};