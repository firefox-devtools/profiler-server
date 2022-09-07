import * as router from 'koa';

declare module 'koa' {
  interface Request extends Koa.BaseRequest {
    body?: any;
  }
}
