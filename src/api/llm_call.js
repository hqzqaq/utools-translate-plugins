import axios from 'axios';

const ZHIPUAI_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"

const zhipuApiRequest = async (apiKey, model, systemPrompt, prompt) => {
    const messages = [];
    if (systemPrompt && systemPrompt.trim() !== '') {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await axios.post(
        ZHIPUAI_URL,
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

export default zhipuApiRequest;