# Logging in the server

We use [mozlog](https://github.com/mozilla/mozlog) for logging in the server.

## Be careful with the API

The API is a bit weird:
* There are always 2 arguments.
* The first argument must be a code without spaces. This is caught at runtime
  when running in development, but because error cases aren't always tested it's
  easy to miss, so extra care needs to be used.
* The second argument can be anything, but we usually use a string or a json
  object.

## General usage

First we get a logging object, then we log using a logging function specific to
the loglevel we want to use.

```js
import { getLogger } from './log';
const log = getLogger('code1');
log.info('code2', message);
```

In the previous example, `code1` and `code2` are joined with a period to make up
the `name` that's used in the logged message.

## Convention to build names

The names need to reflect where a log happens. In most cases we use a sequence
containing:
* the path to the file name, with periods as path separators;
* the function where the log happens (can be skipped if there's only one
  function in the file), or the route path + http verb;
* a unique name reflecting this exact message.

For example, for a log happening in the the function `expandUrl` from the file
`logic/shorten-url.js` related to a problem with the access token, the name
would be `logic.shorten_url.expand_url.no_access_token`. Note how we use
snake-casing to name things.

This is important for production especially, so for log levels of info and
above. Especially remember that in production logs with levels below info won't
be logged, so the remaining logs need to make sense still.

Try to keep all logs in one function with the same prefix.

Logs at the debug, verbose or trace levels do not need to follow this
convention strictly.

In locations out of the endpoint routes we can also relax the convention.

## Log levels

Using the right log level will make it easier to track problems for the
server in production.

Here are the log levels we can use:
* trace: this will gather a stack automatically. Note this is displayed only
  when running the server with `LOG_LEVEL=trace`.
* verbose: this is displayed only when runnint the server with `LOG_LEVEL=verbose` or `trace`.
* debug: by default this is displayed in test and development environments.
* info: this is displayed in production environment too.
* warn: this is for messages more important than info but that aren't errors.
  Especially access control errors need to use this level according to #18.
* error: this is for non-fatal errors.
* critical: this is for fatal errors.

Note that all errors happening in a route will bubble up to a `app.server_error`
log with the level `error`. Logging in in addition to the thrown error could be
useful sometimes to extract specific events.
