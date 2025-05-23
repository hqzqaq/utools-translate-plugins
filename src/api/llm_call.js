import axios from 'axios';

const ZHIPUAI_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"

const DOUBAO_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"

const LLMPostCall = async (LLMProvider,apiKey, model, systemPrompt, prompt) => {
    const messages = [];
    if (systemPrompt && systemPrompt.trim() !== '') {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    let LLMPostCall_URL = ''
    if (LLMProvider === 'doubao') {
        LLMPostCall_URL = DOUBAO_URL;
    } else {
        LLMPostCall_URL = ZHIPUAI_URL;
    }

    const response = await axios.post(
        LLMPostCall_URL,
        {
            model: model,
            messages: messages,
            stream: false
        },
        {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            }
        }
    );
    return response.data.choices[0].message.content;
}

export default LLMPostCall;