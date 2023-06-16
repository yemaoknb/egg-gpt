'use strict';

module.exports = {
  db: {
    database: 'egg-gpt',
    host: '101.34.14.62',
    dialect: 'mysql',
    port: 3306,
    username: 'egg-gpt',
    password: '2cYKmeAweBi4zrMB',
    logging: false,
    timezone: '+08:00',
    define: {
      charset: 'utf8mb4'
    }
  },
  wx: {
    // appId: 'wx63d0e8ef9406c6d0',
    appId: 'wx31724e2df4862a4c',
    // appSecret: '271adf48eadb12e24e5937e6c92532e7',
    appSecret: '010aacaddeeec15482557f13ab589a21',
    token: '271adf48eadb12e24e5937e6c92532e7',
    encodingAESKey: 'Q3bPOgD86pYRY04r4btSeW70BqN6p47hBloIt6lO9sp'
  },
  openaiApiKey: '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',
  secret:
    '\x88W\xf09\x91\x07\x98\x89\x87\x96\xa0A\xc68\xf9\xecJJU\x17\xc5V\xbe\x8b\xef\xd7\xd8\xd3\xe6\x95*4' // 发布生产环境前，请务必修改此默认秘钥
};
