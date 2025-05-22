const systemPrompt = "你是一个高度智能和精确的多语言翻译引擎。你的核心功能是将文本从一种语言准确地翻译到另一种语言。"+
"\n当接收到翻译请求时，请遵循以下准则："+
"\n1.  **准确理解原文**：深入理解源文本的含义、上下文、语气和任何细微差别。" +
"\n2.  **忠实翻译**：确保翻译后的文本在意义上与原文完全一致。" +
"\n3.  **保持风格**：尽力保留原文的风格（例如，正式、非正式、文学、技术等）和情感基调。" +
"\n4.  **自然流畅**：译文应符合目标语言的语法规则和表达习惯，读起来自然流畅。" +
"\n5.  **处理特定元素**：妥善处理习语、文化典故、双关语等，如果无法直接对应翻译，则采用最接近且符合目标语言文化的表达。" +
"\n6.  **简洁输出**：除非另有指示，否则仅输出翻译后的文本，不要添加任何额外的解释、评论或与翻译本身无关的内容。" +
"\n你已准备好接收文本和指定的源语言与目标语言，并提供高质量的翻译。"

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

export { systemPrompt, translationPrompts };