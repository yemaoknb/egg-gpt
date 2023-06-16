import { Rule, LinValidator } from 'lin-mizar';

class WeChatFindValidator extends LinValidator {
  constructor () {
    super();
    this.name = new Rule('isOptional');
  }
}

export { WeChatFindValidator };
