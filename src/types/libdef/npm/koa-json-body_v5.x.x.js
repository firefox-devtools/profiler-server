// flow-typed signature: 2e9661b5e8d01926d949aeea1da6f63e
// flow-typed version: 6868abec69/koa-json-body_v5.x.x/flow_>=v0.53.x

declare module 'koa-json-body' {
  declare type Middleware = (
    ctx: any,
    next: () => Promise<void>
  ) => Promise<void> | void;
  declare type Options = $Shape<{|
    fallback: boolean,
    limit: string | number,
    strict: boolean,
  |}>;

  declare export default function body(options?: Options): Middleware;
}
