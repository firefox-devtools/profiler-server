# Testing with command line commands

It's possible to test the server using `curl` commands. This file can be used as
a cheat sheet to find them easily.

## Upload a file
The following command uploads a file through the server. Curl will automatically
send a `Content-Length` header using the file size. Of course, don't forget to
change the path to the file. Note that the character `@` is important!
```
curl -i -X POST --data-binary @/path/to/file -H 'Accept: application/vnd.firefox-profiler+json;version=1.0' localhost:5252/compressed-store
```

The parameter `-i` outputs the response headers as well as the response.
If you want to see the request headers as well, you can use `-v` to enable the
verbose logs.

If you use `-` instead of the filename, curl will use the standard input. Take
care though because curl buffers completely the input in memory.

## Upload a file using chunked encoding

Sometimes we want to test uploading without the `Content-Length` header. For
this we'll used the chunked encoding, like this:

```
curl -i -X POST --data-binary @/path/to/file -H 'Accept: application/vnd.firefox-profiler+json;version=1.0' -H 'Transfer-Encoding: chunked' localhost:5252/compressed-store
```

Curl will detect that we use the header for chunked encoding and skip sending
the `Content-Length` header.

## Generate big files

You can use the utility `dd` to generate big files. For example:
```
dd if=/dev/zero of=/path/to/file bs=1M count=33
```
will generate a file of 33 MiB filled with zeros.

You can use `/dev/urandom` instead of `/dev/zero` to fill the file with random
data.

## Delete a profile

To test deleting a profile, first upload one, and get the JWT. [Decode the JWT](https://jwt.io/) to get the profileToken value. Finally run:

```sh
# Delete a profile
curl \
  --include \
  --request DELETE \
  --header 'Accept: application/vnd.firefox-profiler+json;version=1.0' \
  --header 'Authorization: Bearer ________PUT_JWT_TOKEN_HERE_______'
  http://localhost:5252/profile/PUT_PROFILE_TOKEN_HERE
```
