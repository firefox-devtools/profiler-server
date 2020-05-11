# Firefox profiler server
[![Matrix][matrix-badge]][matrix]

Welcome to the repository for the Firefox profiler server! This server
implements some APIs needed by the profiler UI.

Here are some links to know more:
* The [Firefox Profiler]
* The [Profiler repository]

## APIs

The APIs are documented in [API.md](./API.md).

## Develop and running the server locally
### Install the local tooling
You will need a recent enough version of [Yarn v1](http://classic.yarnpkg.com/),
version 1.10 is known to work correctly.
You can install it into your home directory on Linux and probably OS X with:

```bash
cd /tmp
wget https://yarnpkg.com/install.sh
chmod a+x install.sh
./install.sh
```
or [follow the instructions specific to your OS on Yarn's website](https://classic.yarnpkg.com/en/docs/install).

### Download the profiler code and install its dependencies
To download and prepare the Firefox Profiler server run:

```bash
git clone git@github.com:firefox-devtools/profiler-server.git
cd profiler-server
yarn install
```

### Configure the server

Then you'll need to configure the server. We use environment variables for this,
and the convention of a `.env` file. Conveniently we provide a file
[.env.example](.env.example) that you can first copy to `.env` then edit
following the comments inside the file.

Note that the profiler server uses 2 external services:
[Google Cloud Storage](https://cloud.google.com/storage/) and
[Bitly](https://bitly.com/) and you'll need accounts to use the server's
endpoints that need them. Both of them provide free accounts. The documentation
in [docs-developer/google-storage.md](docs-developer/google-storage.md) explains
further how to configure Google Cloud Storage.

### Run the server
Lastly you can run the server with:
```bash
yarn start
```
This will start the server on port 5252.

## Build or pull a docker image

We provide a Dockerfile, the very same one we use to build our official docker
image. Find more [in the dedicated documentation](docs-developers/docker.md).

Also the images we use for production [are public](https://hub.docker.com/r/mozilla/profiler-server/tags),
you can pull latest versions with:
* for master: `docker pull mozilla/profiler-server:master-latest`
* for production: `docker pull mozilla/profiler-server:production-latest`

[matrix]: https://chat.mozilla.org/#/room/#profiler:mozilla.org
<!-- chat.mozilla.org's "real" server is mozilla.modular.im. -->
[matrix-badge]: https://img.shields.io/matrix/profiler:mozilla.org?server_fqdn=mozilla.modular.im&label=matrix
[Firefox Profiler]: https://profiler.firefox.com/
[Profiler repository]: https://github.com/firefox-devtools/profiler/
