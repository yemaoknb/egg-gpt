const fs = require('fs');
const axios = require('axios');
const base = 'https://api.weixin.qq.com/cgi-bin/';
const mpBase = 'https://mp.weixin.qq.com/cgi-bin/';
const semanticUrl = 'https://api.weixin.qq.com/semantic/semproxy/search?';
const FormData = require('form-data');
const warnInfo = (message) => {
  console.warn(message || 'Calling deprecated function!'); // Todo: make this cross-browser
};
const api = {
  semanticUrl,
  accessToken: base + 'token?grant_type=client_credential',
  temporary: {
    // 新建临时素材
    upload: base + 'media/upload?', // 新增临时素材
    fetch: base + 'media/get?' // 获取临时素材
  },
  permanent: {
    // 永久素材(需要改动成草稿箱)2022年2月28日下线永久图文素材相关接口
    upload: base + 'material/add_material?', //  新增其他类型永久素材
    uploadNews: base + 'material/add_news?', // 新增其他类型永久素材
    uploadNewsPic: base + 'media/uploadimg?', // 上传图文消息内的图片获取URL
    fetch: base + 'material/get_material?', // 获取永久素材
    del: base + 'material/del_material?', // 删除永久素材
    update: base + 'material/update_news?', // 更新其他类型永久素材
    count: base + 'material/get_materialcount?', // 获取素材总数
    batch: base + 'material/batchget_material?' // #获取素材列表
  },
  // 草稿箱 (替代永久素材的接口)
  draft: {
    fetch: base + 'draft/get?', // 获取草稿
    add: base + 'draft/add?', //  新建草稿
    update: base + 'draft/update?', // 修改草稿
    del: base + 'draft/delete?', // 删除草稿
    count: base + 'draft/count?', // 获取草稿总数
    batch: base + 'draft/batchget?', // 获取草稿列表
    switch: base + 'draft/switch?', // MP端开关（仅内测期间使用）
    switchCheckOnly: base + 'draft/switch?checkonly=1&' // MP端开关（仅内测期间使用）检查开关状态
  },
  // 标签
  tag: {
    create: base + 'tags/create?',
    fetch: base + 'tags/get?',
    update: base + 'tags/update?',
    del: base + 'tags/delete?',
    fetchUsers: base + 'user/tag/get?',
    batchTag: base + 'tags/members/batchtagging?',
    batchUnTag: base + 'tags/members/batchuntagging?',
    getUserTags: base + 'tags/getidlist?'
  },
  // 用户管理
  user: {
    fetch: base + 'user/get?', // 获取用户列表(请使用https协议）
    remark: base + 'user/info/updateremark?',
    info: base + 'user/info?',
    batch: base + 'user/info/batchget?'
  },

  qrcode: {
    create: base + 'qrcode/create?',
    show: mpBase + 'showqrcode?'
  },

  shortUrl: {
    create: base + 'shorturl?'
  },

  ai: {
    translate: base + 'media/voice/translatecontent?'
  },

  menu: {
    // 创建菜单界面
    create: base + 'menu/create?',
    del: base + 'menu/delete?',
    custom: base + 'menu/addconditional?', // get_current_selfmenu_info 获取自定义菜单配置接口
    fetch: base + 'menu/get?'
  },

  ticket: {
    get: base + 'ticket/getticket?'
  }
};

class WeChatApi {
  constructor (opts = {}) {
    this.opts = Object.assign({}, opts);
    this.appId = opts.appId;
    // 微信服务器验证接口配置信息
    this.token = opts.token;
    this.appSecret = opts.appSecret;

    this.accessToken = null;

    this.getTicket = opts.getTicket;
    this.saveTicket = opts.saveTicket;

    this.openaiApiKey = opts.openaiApiKey;
  }
  async postFormData (options) {
    const url = options.url;
    try {
      const formData = new FormData();
      formData.append('media', options.data.media);
      const response = await axios.post(url, formData, {
        params: options.data,
        headers: formData.getHeaders()
      });
      return response;
    } catch (error) {
      console.error('Error occurred during temporary media upload:', error);
    }
  }
  /**
   * 简单的请求封装
   * @param {*} options
   * @returns
   */
  async request (options) {
    options = Object.assign({}, options);

    try {
      let res = null;
      if (options.data && options.data.formData) {
        res = await this.postFormData(options);
      } else {
        res = await axios(options);
      }
      console.log('请求数据', res.data);
      return res.data;
    } catch (err) {
      console.log('错误', err.data);
    }
  }

  /**
   * 1. 首先检查数据库里的 token 是否过期
   * 2. 过期则刷新
   * 3. token 入库
   * @returns {string}
   */
  async fetchAccessToken () {
    let data = await this.getAccessToken();
    if (!this.isValid(data, 'access_token')) {
      data = await this.updateAccessToken();
    }
    await this.saveAccessToken(data);

    return data;
  }

  /**
   *  获取 token
   * @returns {object}
   */
  async updateAccessToken () {
    const url = `${api.accessToken}&appid=${this.appId}&secret=${
      this.appSecret
    }`;
    const data = await this.request({ url });
    const now = new Date().getTime();
    const expiresIn = now + (data.expires_in - 20) * 1000;
    data.expires_in = expiresIn;
    return data;
  }
  /**
   * 获取已经保存的accessToken
   * @returns
   */
  getAccessToken () {
    return this.accessToken;
  }
  /**
   *  保存accessToken
   * @param {*} data
   * @returns
   */
  saveAccessToken (data) {
    this.accessToken = data;
    return data;
  }
  /**
   * 验证当前token是否过期
   * @param {*} data
   * @param {*} name
   * @returns
   */
  isValid (data, name) {
    if (!data || !data[name]) {
      return false;
    }
    const expiresIn = data.expires_in;
    const now = new Date().getTime();
    return now < expiresIn;
  }
  /**
   * 封装用来请求接口的入口方法
   * @param {*} operation
   * @param  {...any} args
   * @returns
   */
  async handle (operation, ...args) {
    const tokenData = await this.fetchAccessToken();
    const options = this[operation](tokenData.access_token, ...args);
    const data = await this.request(options);
    return data;
  }
  /**
   * 上传媒体素材
   * @param {*} token
   * @param {*} type
   * @param {*} material
   * @param {*} permanent
   * @returns
   */
  uploadMaterial (token, type, material, permanent = false) {
    let form = {};
    let url = api.temporary.upload;

    // 永久素材 form 是个 obj，继承外面传入的新对象
    if (permanent) {
      url = api.permanent.upload;
      form = Object.assign(form, permanent);
    }

    // 上传图文消息的图片素材
    if (type === 'pic') {
      url = api.permanent.uploadNewsPic;
    }

    // 图文非图文的素材提交表单的切换
    if (type === 'news') {
      // 新增永久图文素材
      warnInfo(); // 废弃警告
      url = api.permanent.uploadNews;
      form = material;
    } else if (type === 'draft') {
      // 草稿箱
      url = api.draft.add;
      form = material;
    } else {
      form.media = fs.createReadStream(material);
    }

    let uploadUrl = `${url}access_token=${token}`;

    // 根据素材永久性填充 token
    if (!permanent) {
      uploadUrl += `&type=${type}`;
    } else {
      if (type !== 'news' || type !== 'draft') {
        form.access_token = token;
      }
    }
    const options = {
      method: 'POST',
      url: uploadUrl,
      json: true
    };

    // 图文和非图文在 request 提交主体判断
    if (type === 'news' || type === 'draft') {
      options.data = form;
    } else {
      options.data = {
        ...form,
        type: type,
        formData: true
      };
    }

    return options;
  }
  // ---------------------------------------永久素材接口 Material 草稿箱 Draft--------------------------------------------------
  /**
   * 获取素材本身/草稿 默认草稿
   * @param {*} token
   * @param {*} mediaId
   * @param {string} type news | draft
   * @param {*} permanent
   * @returns
   */
  fetchMaterial (token, mediaId, permanent, type = 'draft') {
    let form = {};
    let fetchUrl = api.temporary.fetch;

    if (permanent) {
      if (type === 'draft') {
        // 获取草稿
        fetchUrl = api.draft.fetch;
      } else {
        // 永久素材
        fetchUrl = api.permanent.fetch;
      }
    }
    let url = fetchUrl + 'access_token=' + token;
    let options = { method: 'POST', url };

    if (permanent) {
      form.media_id = mediaId;
      form.access_token = token;
      options.data = form;
    } else {
      if (type === 'video') {
        url = url.replace('https:', 'http:');
      }

      url += '&media_id=' + mediaId;
    }

    return options;
  }
  /**
   * 更新素材/更新草稿
   * @param {*} token
   * @param {*} mediaId
   * @param {*} news
   * @param {*} type news | draft
   * @returns
   */
  updateMaterial (token, mediaId, news, type = 'draft') {
    let form = {
      media_id: mediaId
    };
    form = Object.assign(form, news);
    let url = `${api.draft.update}access_token=${token}&media_id=${mediaId}`;

    // 保留原型的更新永久素材
    if (type !== 'draft') {
      url = `${api.permanent.update}access_token=${token}&media_id=${mediaId}`;
    }

    return { method: 'POST', url, data: form };
  }
  /**
   * 删除素材/草稿
   * @param {*} token
   * @param {*} mediaId
   * @param {*} type news | draft
   * @returns
   */
  deleteMaterial (token, mediaId, type = 'draft') {
    const form = {
      media_id: mediaId
    };
    let urlApi = type === 'draft' ? api.draft.del : api.permanent.del;
    const url = `${urlApi}access_token=${token}&media_id=${mediaId}`;

    return { method: 'POST', url, data: form };
  }
  /**
   * 获取素材总数
   * @param {*} token
   * @param {*} type news | draft
   * @returns
   */
  countMaterial (token, type = 'draft') {
    let urlApi = type === 'draft' ? api.draft.count : api.permanent.count;
    const url = `${urlApi}access_token=${token}`;
    return { method: 'POST', url };
  }
  /**
   * 获取素材列表
   * @param {*} token
   * @param {*} options
   * @param {boolean} type
   * @returns
   */
  batchMaterial (token, options, type = true) {
    options.type = options.type || 'image';
    options.offset = options.offset || 0;
    options.count = options.count || 10;
    let urlApi = type === 'draft' ? api.draft.batch : api.permanent.batch;
    const url = `${urlApi}access_token=${token}`;
    return { method: 'POST', url, data: options };
  }
  // -----------------------------------------END 永久素材接口 END-----------------------------------------------------
  // ---------------------------用户管理信息 user-------------------------------------------
  // 给用户设置别名 服务号专用接口
  remarkUser (token, openId, remark) {
    const body = {
      openid: openId,
      remark
    };
    const url = api.user.remark + 'access_token=' + token;

    return { method: 'POST', url, body };
  }
  /**
   * 获取粉丝列表
   * @param {*} token 请求接口的token
   * @param {*} openId 小程序的openId
   * @returns
   */
  fetchUserList (token, openId = '') {
    const url = `${api.user.fetch}access_token=${token}&next_openid=${openId}`;
    return { url };
  }
  /**
   * 持久化用户 对用户打标签和统计
   * @param {*} message
   * @param {*} from
   */
  async saveMPUser (message, from = '') {
    let sceneId = message.EventKey;
    let openId = message.FromUserName;
    let count = 0;

    if (sceneId && sceneId.indexOf('qrscene_') > -1) {
      sceneId = sceneId.replace('qrscene_', '');
    }
    // TODO: 走数据库
    let user = null;
    // let user = await User.findOne({
    //   openid: openid
    // });

    let userInfo = await this.handle('getUserInfo', openId);

    if (sceneId === 'imooc') {
      from = 'imooc';
    }

    if (!user) {
      let userData = {
        from: from,
        openid: [userInfo.openid],
        unionid: userInfo.unionid,
        nickname: userInfo.nickname,
        email: (userInfo.unionid || userInfo.openid) + '@wx.com',
        province: userInfo.province,
        country: userInfo.country,
        city: userInfo.city,
        gender: userInfo.gender || userInfo.sex
      };

      console.log(userData);

      // user = new User(userData);
      // user = await user.save();
      user = userData;
    }

    // if (from === 'imooc') {
    //   let tagid;

    //   count = await User.count({
    //     from: 'imooc'
    //   });

    //   try {
    //     let tagsData = await client.handle('fetchTags');

    //     tagsData = tagsData || {};
    //     const tags = tagsData.tags || [];
    //     const tag = tags.filter(tag => {
    //       return tag.name === 'imooc';
    //     });

    //     if (tag && tag.length > 0) {
    //       tagid = tag[0].id;
    //       count = tag[0].count || 0;
    //     } else {
    //       let res = await client.handle('createTag', 'imooc');

    //       tagid = res.tag.id;
    //     }

    //     if (tagid) {
    //       await client.handle('batchTag', [openid], tagid);
    //     }
    //   } catch (err) {
    //     console.log(err);
    //   }
    // }

    return {
      user,
      count
    };
  }

  /**
   * 获取用户的详细信息
   * @param {*} token
   * @param {*} openId
   * @param {*} lan
   * @returns
   */
  getUserInfo (token, openId, lan = 'zh_CN') {
    const url =
      api.user.info +
      'access_token=' +
      token +
      '&openid=' +
      openId +
      '&lang=' +
      lan;

    return { url };
  }

  // 批量获取用户详细信息
  fetchBatchUsers (token, openIdList) {
    const body = {
      user_list: openIdList
    };

    const url = api.user.batch + 'access_token=' + token;

    return { method: 'POST', url, body };
  }
  // ------------------------------------END 获取用户管理信息 END----------------------------------

  // 创建标签
  createTag (token, name) {
    const body = {
      tag: {
        name
      }
    };

    const url = api.tag.create + 'access_token=' + token;

    return { method: 'POST', url, body };
  }

  // 获取全部的标签
  fetchTags (token) {
    const url = api.tag.fetch + 'access_token=' + token;

    return { url };
  }

  // 编辑标签
  updateTag (token, id, name) {
    const body = {
      tag: {
        id,
        name
      }
    };

    const url = api.tag.update + 'access_token=' + token;

    return { method: 'POST', url, body };
  }

  // 删除标签
  delTag (token, id) {
    const body = {
      tag: {
        id
      }
    };

    const url = api.tag.del + 'access_token=' + token;

    return { method: 'POST', url, body };
  }

  // 获取标签下的粉丝列表
  fetchTagUsers (token, id, openId) {
    const body = {
      tagid: id,
      next_openid: openId || ''
    };

    const url = api.tag.fetchUsers + 'access_token=' + token;

    return { method: 'POST', url, body };
  }

  // 批量加标签和取消标签
  batchTag (token, openidList, id, unTag) {
    const body = {
      openid_list: openidList,
      tagid: id
    };

    let url = !unTag ? api.tag.batchTag : api.tag.batchUnTag;
    url += 'access_token=' + token;

    return { method: 'POST', url, body };
  }

  getUserTags (token, openId) {
    const body = {
      openid: openId
    };

    const url = api.tag.getUserTags + 'access_token=' + token;

    return { method: 'POST', url, body };
  }
  //
  async fetchTicket (token) {
    let data = await this.getTicket();

    if (!this.isValid(data, 'ticket')) {
      data = await this.updateTicket(token);
    }

    await this.saveTicket(data);

    return data;
  }
  // 获取 token
  async updateTicket (token) {
    const url = `${api.ticket.get}access_token=${token}&type=jsapi`;

    const data = await this.request({ url });
    const now = new Date().getTime();
    const expiresIn = now + (data.expires_in - 20) * 1000;

    data.expires_in = expiresIn;

    return data;
  }
  // 创建二维码 Ticket
  createQrcode (token, qr) {
    const url = api.qrcode.create + 'access_token=' + token;
    const body = qr;

    return { method: 'POST', url, body };
  }

  // 通过 Ticket 换取二维码
  showQrcode (ticket) {
    const url = api.qrcode.show + 'ticket=' + encodeURI(ticket);

    return url;
  }

  // 长链接转短链接
  createShortUrl (token, action = 'long2short', longurl) {
    const url = api.shortUrl.create + 'access_token=' + token;
    const body = {
      action,
      long_url: longurl
    };

    return { method: 'POST', url, body };
  }

  // 语义理解-查询特定的语句进行分析
  semantic (token, semanticData) {
    const url = api.semanticUrl + 'access_token=' + token;
    semanticData.appid = this.appId;

    return { method: 'POST', url, body: semanticData };
  }

  // AI 接口
  aiTranslate (token, body, lfrom, lto) {
    const url =
      api.ai.translate +
      'access_token=' +
      token +
      '&lfrom=' +
      lfrom +
      '&lto=' +
      lto;

    return { method: 'POST', url, body };
  }

  // 创建菜单和自定义菜单
  createMenu (token, menu, rules) {
    let url = api.menu.create + 'access_token=' + token;

    if (rules) {
      url = api.menu.custom + 'access_token=' + token;
      menu.matchrule = rules;
    }

    return { method: 'POST', url, body: menu };
  }

  // 删除菜单
  deleteMenu (token) {
    const url = api.menu.del + 'access_token=' + token;

    return { url };
  }

  // 获取菜单
  fetchMenu (token) {
    const url = api.menu.fetch + 'access_token=' + token;

    return { url };
  }
}
export { WeChatApi };
