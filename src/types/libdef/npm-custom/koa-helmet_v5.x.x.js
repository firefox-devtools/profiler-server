// koa-helmet explicitely supports the same API than helmet, so I imported the
// libdef for helmet from https://github.com/flow-typed/flow-typed/blob/master/definitions/npm/helmet_v3.x.x/flow_v0.93.x-v0.103.x/helmet_v3.x.x.js
// Then reformatted using prettier and improved for our usage.
// @flow
declare type KoaHelmet$Middleware = (
  ctx: any,
  next: () => Promise<void>
) => Promise<void> | void;

declare type helmet$XssFilterOptions = $Shape<{|
  setOnOldIE: boolean,
  reportUri: string,
  mode: null,
|}>;

declare type helmet$ReferrerPolicy =
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'same-origin'
  | 'origin'
  | 'strict-origin'
  | 'origin-when-cross-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url'
  | '';

declare type helmet$ReferrerPolicyOptions = {|
  policy: helmet$ReferrerPolicy | helmet$ReferrerPolicy[],
|};

declare type helmet$HstsOptions = $Shape<{|
  maxAge: number,
  includeSubDomains: boolean,
  preload: boolean,
  setIf: (req: http$IncomingMessage<>, res: http$ServerResponse) => boolean,
|}>;

declare type helmet$HpkpOptions = {|
  maxAge: number,
  sha256s: Array<string>,
  includeSubDomains?: boolean,
  reportUri?: string,
  reportOnly?: boolean,
  setIf?: (req: http$IncomingMessage<>, res: http$ServerResponse) => boolean,
|};

declare type helmet$HidePoweredByOptions = {|
  setTo: string,
|};

declare type helmet$FrameguardOptions =
  | {|
      action: 'deny' | 'sameorigin',
    |}
  | {| action: 'allow-from', domain: string |};

declare type helmet$ExpectCT = $Shape<{|
  enforce: boolean,
  maxAge: number,
  reportUri: string,
|}>;

declare type helmet$DnsOptions = {|
  allow: boolean,
|};

// source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/sandbox
declare type helmet$SandboxValue =
  | 'allow-downloads-without-user-activation'
  | 'allow-forms'
  | 'allow-modals'
  | 'allow-orientation-lock'
  | 'allow-pointer-lock'
  | 'allow-popups'
  | 'allow-popups-to-escape-sandbox'
  | 'allow-presentation'
  | 'allow-same-origin'
  | 'allow-scripts'
  | 'allow-storage-access-by-user-activation'
  | 'allow-top-navigation'
  | 'allow-top-navigation-by-user-activation';

// source: https://helmetjs.github.io/docs/csp/
// TODO: support functions
declare type helmet$CspDirectives = $Shape<{|
  baseUri: string[],
  blockAllMixedContent: true,
  childSrc: string[],
  connectSrc: string[],
  defaultSrc: string[],
  fontSrc: string[],
  formAction: string[],
  frameAncestors: string[],
  frameSrc: string[],
  imgSrc: string[],
  manifestSrc: string[],
  mediaSrc: string[],
  objectSrc: string[],
  pluginTypes: string[],
  prefetchSrc: string[],
  reportTo: string,
  reportUri: string,
  requireSriFor: Array<'script' | 'style'>,
  sandbox: helmet$SandboxValue[],
  scriptSrc: string[],
  styleSrc: string[],
  upgradeInsecureRequests: true,
  workerSrc: string[],
|}>;

declare type helmet$CspOptions = $Shape<{|
  directives?: helmet$CspDirectives,
  loose?: boolean,
  reportOnly?: boolean,
  setAllHeaders?: boolean,
  disableAndroid?: boolean,
  browserSniff?: boolean,
|}>;

declare module 'koa-helmet' {
  declare module.exports: {|
    (
      options?: $Shape<{|
        contentSecurityPolicy: boolean | helmet$CspOptions,
        dnsPrefetchControl: boolean | helmet$DnsOptions,
        expectCt: boolean | helmet$ExpectCT,
        frameguard: boolean | helmet$FrameguardOptions,
        hidePoweredBy: boolean | helmet$HidePoweredByOptions,
        hpkp: boolean | helmet$HpkpOptions,
        hsts: boolean | helmet$HstsOptions,
        ieNoOpen: boolean,
        noCache: boolean,
        noSniff: boolean,
        referrerPolicy: boolean | helmet$ReferrerPolicyOptions,
        xssFilter: boolean | helmet$XssFilterOptions,
      |}>
    ): KoaHelmet$Middleware,
    contentSecurityPolicy(options?: helmet$CspOptions): KoaHelmet$Middleware,
    dnsPrefetchControl(options?: helmet$DnsOptions): KoaHelmet$Middleware,
    expectCt(options?: helmet$ExpectCT): KoaHelmet$Middleware,
    frameguard(options?: helmet$FrameguardOptions): KoaHelmet$Middleware,
    hidePoweredBy(options?: helmet$HidePoweredByOptions): KoaHelmet$Middleware,
    hpkp(options: helmet$HpkpOptions): KoaHelmet$Middleware,
    hsts(options?: helmet$HstsOptions): KoaHelmet$Middleware,
    ieNoOpen(): KoaHelmet$Middleware,
    noCache(): KoaHelmet$Middleware,
    noSniff(): KoaHelmet$Middleware,
    referrerPolicy(
      options?: helmet$ReferrerPolicyOptions
    ): KoaHelmet$Middleware,
    xssFilter(options?: helmet$XssFilterOptions): KoaHelmet$Middleware,
  |};
}
