import * as storage from '@google-cloud/storage';

declare module '@google-cloud/storage' {
  declare type Error = {
    message: string;
    domain: string;
    reason: string;
  };

  declare type ErrorResponse = {
    // Status code like 404.
    code: number;
    errors: Error[];
    response: mixed;
    message: string;
  };
}
