import * as Koa from 'koa';

declare module 'koa' {
  interface Request {
    // Extending the Request interface to include an optional body field.
    // This comes from koa-json-body package. We have to extend this one here to
    // make Typescript happy about accessing this field.
    body?: any;
  }
}
