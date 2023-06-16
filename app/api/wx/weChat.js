import { LinRouter, disableLoading, config } from 'lin-mizar';
import { WeChatFindValidator } from '../../validator/weChat';
import { WeChat } from '../../weChat-lib/index';
// book 的红图实例
const weChatApi = new LinRouter({
  prefix: '/wx/weChat',
  module: '微信'
});
// 引入公众号相关数据
const WeChatLib = new WeChat({
  appId: config.getItem('wx.appId'),
  // 微信服务器验证接口配置信息
  token: config.getItem('wx.token'),
  appSecret: config.getItem('wx.appSecret'),
  openaiApiKey: config.getItem('openaiApiKey')
});
// 对比
weChatApi.get('/token', async (ctx) => {
  const v = await new WeChatFindValidator().validate(ctx);
  let result = WeChatLib.validateSignature(v.get('query'));
  ctx.body = result ? v.get('query.echostr') : 'fail';
});
// 微信用户发送请求过来
weChatApi.post('/token', async (ctx, next) => {
  const v = await new WeChatFindValidator().validate(ctx);
  let result = WeChatLib.validateSignature(v.get('query'));

  if (!result) {
    ctx.body = 'fail';
    return false;
  }
  try {
    let xml = await WeChatLib.parseXml(ctx, next);
    ctx.body = xml;
  } catch (err) {
    ctx.status = 400;
    ctx.body = 'Invalid request';
  }

  // const { Content } = xml;
  // const reply = await generateReply(Content); // 调用 ChatGPT 生成回复
  // // 返回回复消息
  // ctx.body = {
  //   xml: {
  //     ToUserName: xml.FromUserName,
  //     FromUserName: xml.ToUserName,
  //     CreateTime: Date.now(),
  //     MsgType: 'text',
  //     Content: reply
  //   }
  // };
});

module.exports = { weChatApi, [disableLoading]: false };
