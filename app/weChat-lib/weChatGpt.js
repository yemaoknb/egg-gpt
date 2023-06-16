const axios = require('axios');
class WeChatGPT {
  constructor (opts = {}) {
    this.opts = Object.assign({}, opts);
    this.openaiApiKey = opts.openaiApiKey;
  }
  /**
   * ChatGPT 生成回复
   * @param {*} content
   * @returns
   */
  async generateReply (content) {
  // 调用 ChatGPT 接口生成回复
    console.log('gptResponse', content);
    const apiUrl = 'https://api.openai.com/v1/engines/davinci-codex/completions';
    const apiKey = this.openaiApiKey; // 替换为您的 OpenAI API 密钥
    const gptResponse = await axios.post(apiUrl,
      {
        prompt: content,
        max_tokens: 50,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}` // 请将 your_openai_api_key 替换为您的 OpenAI API 密钥
        }
      }
    );
    console.log('gptResponse2', gptResponse);
    const { choices } = gptResponse.data;
    if (choices && choices.length > 0) {
      return choices[0].text.trim();
    }

    return 'Sorry, I cannot generate a reply at the moment.';
  }
}
export { WeChatGPT };
