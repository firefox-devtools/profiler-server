import * as storage from '@google-cloud/storage';

declare module '@google-cloud/storage' {
  type Error = {
    message: string;
    domain: string;
    reason: string;
  };

  type ErrorResponse = {
    // Status code like 404.
    code: number;
    errors: Error[];
    response: any;
    message: string;
  };
}
