// wechatMiddleware.js

/**
 * 插件
 * npm install crypto axios raw-body xml2js ejs form-data --save
 */
import { WeChatGPT } from './weChatGpt';

import { WeChatApi } from './weChatApi';
const crypto = require('crypto');
const rawBody = require('raw-body');
const util = require('./util');
const { reply } = require('./reply');
const GPT = new WeChatGPT();
class WeChat extends WeChatApi {
  constructor (opts) {
    super();
    this.opts = Object.assign({}, opts);
    this.appId = opts.appId;
    // 微信服务器验证接口配置信息
    this.token = opts.token;
    this.appSecret = opts.appSecret;

    this.accessToken = null;

    this.getTicket = opts.getTicket;
    this.saveTicket = opts.saveTicket;

    this.openaiApiKey = opts.openaiApiKey;

    this.reply = opts.reply || reply;
    this.fetchAccessToken();
  }
  /**
   * 对接配置公众号
   * @param {object | string} query 传入已经格式化好的query（゜▽＾*））
   * @returns {boolean}
   */
  validateSignature (query) {
    const { signature, timestamp, nonce } = query;
    // // 字典排序
    const str = [this.token, timestamp, nonce].sort().join('');
    const sha1Str = crypto
      .createHash('sha1')
      .update(str)
      .digest('hex');
    return sha1Str === signature;
  }

  /**
   * 解析微信发过来的xml
   * @param {*} ctx
   * @param {*} next
   */
  async parseXml (ctx, next) {
    // 从请求中获取原始的 XML 数据
    const xmlData = await rawBody(ctx.req, {
      length: ctx.req.headers['content-length'],
      limit: '1mb', // 限制请求体大小
      encoding: ctx.request.charset || 'utf-8'
    });
    // 处理微信消息
    const content = await util.parseXML(xmlData);
    const message = await util.formatMessage(content.xml);
    // ctx.weiXin = message;
    // ctx.WeChatApi = this;
    // try {
    //   ctx.appId = this.appId;
    //   await this.reply.apply(ctx, [ctx, next]);
    // } catch (e) {}
    // const replyBody = ctx.body;
    // let msg = ctx.weiXin;
    // console.log('内容', replyBody);
    // const body = await util.tpl(replyBody, msg);

    const reply = await GPT.generateReply(message.Content); // ChatGPT 生成回复
    console.log(reply);
    const body = await util.tpl(reply, message);
    return body;
  }
}
export { WeChat };
