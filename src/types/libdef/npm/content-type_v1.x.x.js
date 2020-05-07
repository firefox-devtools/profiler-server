// flow-typed signature: 4292b05a7a022704477c363d9d3a83e3
// flow-typed version: 65e0953bf0/content-type_v1.x.x/flow_>=v0.84.x

declare module 'content-type' {
  declare type contentType$OutputParsedContentType = {|
    type: string,
    parameters: {| [string]: string |},
  |};

  declare type contentType$InputParsedContentType = {|
    +type: string,
    +parameters?: { [string]: string | number, ... },
  |};

  declare function parse(
    string | http$IncomingMessage<> | http$ServerResponse
  ): contentType$OutputParsedContentType;

  declare function format(contentType$InputParsedContentType): string;

  declare module.exports: {|
    +parse: typeof parse,
    +format: typeof format,
  |};
}
