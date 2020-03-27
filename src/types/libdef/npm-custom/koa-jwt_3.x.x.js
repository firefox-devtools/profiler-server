// @flow
// Adapted from: https://github.com/koajs/jwt/blob/master/types/index.d.ts
// Type definitions for koa-jwt 2.x
// Project: https://github.com/koajs/jwt
// Definitions by: Bruno Krebs <https://github.com/brunokrebs/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

import type { Context, Middleware } from 'koa';

declare type Options = {
  secret: string | string[] | Buffer | Buffer[] | SecretLoader,
  key?: string,
  tokenKey?: string,
  getToken?: (ctx: Context, opts: Options) => string,
  isRevoked?: (
    ctx: Context,
    decodedToken: mixed,
    token: string
  ) => Promise<boolean>,
  passthrough?: boolean,
  cookie?: string,
  debug?: boolean,
  audience?: string | string[],
  issuer?: string | string[],
  algorithms?: string[],
};

export type SecretLoader = (
  header: any,
  payload: any
) => Promise<string | string[] | Buffer | Buffer[]>;

declare module 'koa-jwt' {
  declare module.exports: (options: Options) => Middleware;
}
