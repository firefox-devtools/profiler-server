// flow-typed signature: 7779dbcc899bd5b8a5dfa58ece9fd045
// flow-typed version: 80076230ec/mozlog_v2.2.x/flow_>=v0.84.x

declare module 'mozlog' {
  declare type LoggerFunction = (string, mixed) => void;

  declare interface Logger {
    trace: LoggerFunction;
    verbose: LoggerFunction;
    debug: LoggerFunction;
    info: LoggerFunction;
    warn: LoggerFunction;
    error: LoggerFunction;
    critical: LoggerFunction;

    // aliases
    warning: LoggerFunction;
    o_O: LoggerFunction; // alias to warn
    O_O: LoggerFunction; // alias to error
  }

  declare type LoggerCreator = (string) => Logger;

  declare export default function mozlog(options: string | {|
    +app: string,
    +fmt?: 'pretty' | 'heka' | void | null,
    +debug?: ?boolean,
    +level?:
      | 'trace' | 'verbose' | 'debug' | 'info' | 'warn' | 'error' | 'critical'
      | 'TRACE' | 'VERBOSE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'
      | void | null,
    +uncaught?: 'exit' | 'log' | 'ignore' | void | null,
    +stream?: stream$Writable | void | null,
    +config?: { ... },
  |}): LoggerCreator;
}
