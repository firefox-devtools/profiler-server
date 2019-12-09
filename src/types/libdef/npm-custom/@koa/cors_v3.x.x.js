// @flow

declare module '@koa/cors' {
  declare type Middleware = (
    ctx: any,
    next: () => Promise<void>
  ) => Promise<void> | void;
  declare type Options = $Shape<{|
    origin: string | ((ctx: any) => string | Promise<string>), // Note: context is a bit painful to type from scratch, so ignoring this case now.
    allowMethods: string | string[],
    exposeHeaders: string | string[],
    allowHeaders: string | string[],
    maxAge: string | number,
    credentials: boolean,
    keepHeadersOnError: boolean,
  |}>;

  declare export default function cors(options?: Options): Middleware;
}
