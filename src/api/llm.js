import OpenAI from 'openai';
import LLMPostCall from "./llm_call.js";
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
            return await LLMPostCall("zhipu",client, model, systemPrompt, prompt);
        }
    },
    doubao: {
        name: '豆包',
        models: [
            { id: 'doubao-1.5-pro-32k-250115', name: '豆包 32K' },
            { id: 'doubao-1.5-pro-256k-250115', name: '豆包 256K' },
        ],
        createClient: (apiKey) => apiKey,
        translate: async (client, model, prompt) => {
            return await LLMPostCall("doubao",client, model, systemPrompt, prompt);
        }
    },
    openai: {
        name: 'OpenAI',
        models: [
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
            { id: 'gpt-4', name: 'GPT-4' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
        ],
        createClient: (apiKey) => new OpenAI({
            apiKey: apiKey,
            dangerouslyAllowBrowser: true  // 添加此选项允许在浏览器环境中使用
        }),
        translate: async (client, model, prompt) => {
            const response = await client.chat.completions.create({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }],
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
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: prompt }
                        ],
                    });
                    return response.choices[0].message.content;
                }
            };
        });
    }
};

// 自定义提示模板存储
// 修改为按提供商分类存储
let customPrompts = {
// 默认分类
default: {},
// 按提供商分类
// zhipu: {},
// doubao: {},
// openai: {},
// custom_xxx: {}
};

// 从uTools数据库加载自定义提示模板
const loadCustomPrompts = () => {
    const savedPrompts = window.utools.dbStorage.getItem('custom_prompts');
    if (savedPrompts) {
        customPrompts = savedPrompts;
        // 确保有默认分类
        if (!customPrompts.default) {
            customPrompts.default = {};
        }
    }
};

// 保存自定义提示模板到uTools数据库
const saveCustomPrompts = () => {
    window.utools.dbStorage.setItem('custom_prompts', customPrompts);
};

// 获取自定义提示模板
export const getCustomPrompts = (provider = 'default') => {
    // 确保该提供商的分类存在
    if (!customPrompts[provider]) {
        customPrompts[provider] = {};
    }
    return customPrompts[provider];
};

// 初始化加载自定义配置
loadCustomConfigs();
loadCustomPrompts();

// 获取所有支持的翻译模式
export const getTranslationModes = (provider = 'default') => {
    // 合并默认翻译模式和自定义翻译模式
    const providerPrompts = getCustomPrompts(provider);
    const defaultPrompts = getCustomPrompts('default');
    const allPrompts = { ...translationPrompts, ...defaultPrompts, ...providerPrompts };

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
    let providerKey = provider;
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
    // 先查找当前提供商的自定义提示，再查找默认提示，最后使用系统提示
    const providerPrompts = getCustomPrompts(providerKey);
    const defaultPrompts = getCustomPrompts('default');
    const allPrompts = { ...translationPrompts, ...defaultPrompts, ...providerPrompts };
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
export const addCustomPrompt = (key, name, promptTemplate, provider = 'default') => {
    // 确保该提供商的分类存在
    if (!customPrompts[provider]) {
        customPrompts[provider] = {};
    }
    
    // 检查是否与系统提示冲突
    if (translationPrompts[key] && provider === 'default') {
        throw new Error(`提示模板键名 "${key}" 已存在于系统提示中`);
    }
    
    // 检查是否与默认提示冲突
    if (customPrompts.default[key] && provider !== 'default') {
        throw new Error(`提示模板键名 "${key}" 已存在于默认提示中`);
    }

    customPrompts[provider][key] = {
        name: name,
        prompt: promptTemplate
    };

    saveCustomPrompts();
    return key;
};

// 删除自定义提示模板
export const removeCustomPrompt = (key, provider = 'default') => {
    if (!customPrompts[provider]) {
        return false;
    }
    
    if (customPrompts[provider][key]) {
        delete customPrompts[provider][key];
        saveCustomPrompts();
        return true;
    }
    return false;
};

// 更新自定义提示模板
export const updateCustomPrompt = (key, name, promptTemplate, provider = 'default') => {
    if (!customPrompts[provider]) {
        customPrompts[provider] = {};
    }
    
    if (!customPrompts[provider][key]) {
        throw new Error(`提示模板 "${key}" 不存在于当前提供商中`);
    }

    customPrompts[provider][key] = {
        name: name,
        prompt: promptTemplate
    };

    saveCustomPrompts();
    return key;
};

// 从提供商中删除模型
export const removeModelFromProvider = (provider, modelId) => {
    // 处理自定义提供商
    if (provider.startsWith('custom_')) {
        const customKey = provider.replace('custom_', '');
        if (modelConfigs.custom[customKey]) {
            // 获取当前模型列表
            const models = modelConfigs.custom[customKey].models;
            
            // 确保至少保留一个模型
            if (models.length <= 1) {
                throw new Error('无法删除最后一个模型，每个提供商至少需要保留一个模型');
            }
            
            // 查找模型索引
            const modelIndex = models.findIndex(m => m.id === modelId);
            if (modelIndex === -1) {
                throw new Error(`模型ID "${modelId}" 不存在`);
            }
            
            // 删除模型
            models.splice(modelIndex, 1);
            
            // 保存自定义配置
            saveCustomConfigs();
            return true;
        }
        return false;
    } else {
        // 内置提供商不允许删除模型
        throw new Error(`不能从内置提供商 "${provider}" 删除模型`);
    }
};

// 为现有提供商添加模型
export const addModelToProvider = (provider, modelId, modelName) => {
    // 处理自定义提供商
    if (provider.startsWith('custom_')) {
        const customKey = provider.replace('custom_', '');
        if (modelConfigs.custom[customKey]) {
            // 检查模型ID是否已存在
            const modelExists = modelConfigs.custom[customKey].models.some(m => m.id === modelId);
            if (modelExists) {
                throw new Error(`模型ID "${modelId}" 已存在`);
            }
            
            // 添加新模型
            modelConfigs.custom[customKey].models.push({
                id: modelId,
                name: modelName
            });
            
            // 保存自定义配置
            saveCustomConfigs();
            return true;
        }
        return false;
    } else {
        // 内置提供商不允许添加模型
        throw new Error(`不能为内置提供商 "${provider}" 添加模型`);
    }
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
    getCustomPrompts,
    removeModelFromProvider,
    addModelToProvider
};