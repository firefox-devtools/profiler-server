# Profiler Server APIs

This document presents and details the API that are available on this server.
We'll also give some commands to test them with standard Unix tools and `curl`.

Be careful to replace some placeholders with the real values.

## Versioning

We version all the business endpoinds described in this document. This is
handled by a header:
```
Accept: application/vnd.firefox-profiler+json;version=1.0
```

This header needs to be sent with every call.

## CORS

These endpoints are CORS-friendly and can be called from any website.

## Upload: `POST /compressed-store`

Input:
* The data to upload as the raw body. Note the service supports the chunked
  encoding too.

Output:
* A JWT token if successful (HTTP status is 200)

Possible errors:
* 400: Bad Request if the pushed data isn't a gzipped JSON
* 413: Payload Too Large if the pushed data is too big
* 500: unexpected error

### How to use it from the command-line
You can use the utility [tools/generate-file.js](../tools/generate-file.js) to generate
big files suitable to use with the server. For example:
```
node tools/generate-file.js 5m ____PATH_TO_FILE____
```
will generate a file of 5 MiB that the server will accept. This is a JSON file
filled in with random values.

Then you can push the file to the storage:
```
curl -i -X POST --data-binary @____PATH_TO_FILE____ \
  -H 'Accept: application/vnd.firefox-profiler+json;version=1.0' \
  ____SERVER_DOMAIN____/compressed-store
```

Result must be 200 with a JWT token as a text result.

This JWT token is important because this is what authenticates and authorizes you
as the profile uploader. You'll be able to use it in some other endpoints.

This JWT contains the profile token. This token is simply the profile's location
in our Google Cloud Storage's bucket. You can access the raw data at the location:
`https://storage.googleapis.com/profile-store/____PROFILE_TOKEN____`, and load the
profile data in our UI at the URL
`https://profiler.firefox.com/public/____PROFILE_TOKEN____`.

You can decode the JWT to get the profile token using our tool
[decode_jwt_payload.py](https://github.com/firefox-devtools/profiler-server/blob/master/tools/decode_jwt_payload.py),
that you can just copy paste because it has no dependency.

From the JWT token, this gets the profile token:
```
echo '____PUT_JWT_TOKEN_HERE____' | tools/decode_jwt_payload.py
```

## Delete profile: `DELETE /profile/____PROFILE_TOKEN____`

Inputs:
* the JWT token in the header `Authorization`.
* the profile token in the URL.

Output:
* A 200 status with some text explaining what happened.

Possible errors:
* 400 Bad Request: if no profile token was passed.
* 401 Forbidden: if the JWT is absent or invalid.
* 404 Not Found: if there's no data for this profile token.
* 500: for an unexpected error.

### With the command line

This is how we delete the previously uploaded file:
```
curl \
  --include \
  --request DELETE \
  --header 'Accept: application/vnd.firefox-profiler+json;version=1.0' \
  --header 'Authorization: Bearer ____PUT_JWT_TOKEN_HERE___' \
  ____SERVER_DOMAIN____/profile/____PUT_PROFILE_TOKEN_HERE____
```

Notice that you have to put the JWT token for authentication, and the profile
token to specify the profile data you want to delete.

This returns a status 200 if the deletion is successful.

## Shorten URL: `POST /shorten`

This service allows to shorten a profiler-related URL.

Input: a JSON object containing:
* a property `longUrl`: the URL to be shortened.

Output: a JSON object containing:
* a property `shortUrl`: the shortened URL.

Possible errors:
* 400 Bad Request: if the input json is malformed, the property `longUrl` is
  missing, or it doesn't start with `https://profiler.firefox.com/`.
* 500: for an unexpected error.

### With the command line:

```
curl -i -X POST \
  --data-binary '{ "longUrl": "https://profiler.firefox.com/" }' \
  -H 'Accept: application/vnd.firefox-profiler+json;version=1.0' \
  ____SERVER_DOMAIN____/shorten
```
This should return a json that looks like:
```json
{ "shortUrl": "https://share.firefox.dev/XXXXXX" }
```

## Expand URL: `POST /expand`
This service allows to expand a profiler-related URL.

Input: a JSON object containing:
* a property `shortUrl`: the shortened URL.

Output: a JSON object containing:
* a property `longUrl`: the long URL

Possible errors:
* 400 Bad Request: if the input json is malformed, the property `shortUrl` is
missing, or the resulting long URL doesn't start with `https://profiler.firefox.com/`.
* 500: for an unexpected error.

### With the command line:
```
curl -i -X POST \
  --data-binary '{ "shortUrl": "https://share.firefox.dev/XXXXXX" }' \
  -H 'Accept: application/vnd.firefox-profiler+json;version=1.0' \
  ____SERVER_DOMAIN____/expand
```
This should return a json that looks like:
```json
{ "longUrl": "https://profiler.firefox.com/" }
```

## Technical endpoints

These endpoints don't support CORS and aren't versioned:

* `/__version__`: returns the version information for the currently deployed
  server.
* `/__heartbeat__`: returns 200 if the server and 3rd-party servers are up.
* `/__lbheartbeat__`: returns 200 if the server is up.

