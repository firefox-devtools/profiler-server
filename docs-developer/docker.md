# Docker

In production the profiler server runs in a docker container. In this document
we'll describe some of the basic commands around creating and handling this
docker container.

## Basic commands

### Build the docker image

The [Dockerfile](../Dockerfile) describes the image. It could be run directly
using the command:

```
yarn docker:build
```

The image generated from this command has a tag from the name and the version in
package.json, currently `profiler-server:dev`.

Using `yarn docker:build --pull` will update the base image, it's useful to do
it from time to time.

### Run the docker image in a container

We can run the last built image in a new container with the command:

```
yarn docker:run
```

This makes use of the local file .env to provide environment variables.
Especially the environment variable `JWT_SECRET` needs to be set.
**Be careful that the `.env` file doesn't use quotes or superfluous space characters.**

If the variable `GCS_AUTHENTICATION_PATH` is set the pointed file will be
mounted to the docker instance as well, so that Google Storage authentication
works.

The app should listen on port 8000. The container is named `profiler-server`.

Pressing Ctrl-C will gracefully close the app and the container, then delete the
container.

Pressing Ctrl-P CTRL-Q will put the container in background. You can use `yarn
docker:stop` to stop it then.

### Run the docker image in a detached container

This can easily be done with the command:

```
yarn docker:run:detached
```

Then the container can be stopped with:

```
yarn docker:stop
```

## More information and troubleshooting

### Running the docker image

`yarn docker:run` runs the script bin/docker-run.js, which is basically a shortcut for:

```
docker run \
  -t -i \
  -p 8000:8000 \
  --rm \
  --name profiler-server \
  --env-file .env \
  --mount type=bind,source=<path-to-GCS-config>,target=<path-to-GCS-config>,readonly \
  profiler-server:dev
```

Here is a quick explanation of the command line parameters:

- `-t` allocates a pseudo-tty, while `-i` makes the container interactive. These
  two parameters makes it possible to interact with the container. Especially
  Ctrl-C can gracefully stop the container.
- `-p 8000:8000` makes the container listen on port 8000, and binds it to the
  inner port 8000 which is the default port configured while building the
  container. (Please see below to change this port.)
- `--rm` removes the container when it stops.
- `--name` name this container so that it's easier to reference in commands.
- `--env-file .env` imports environment variable to the newly created instance.
- `--mount type=bind,source=XXX,target=XXX,readonly`: this makes it possible to
  authenticate to Google Cloud Storage by sharing the authentication file.

The script can take some parameters. See below and run `yarn docker:run --help`
to find out more.

### Running a shell in the image

It's easy to run a bash shell as the running user:

```
yarn docker:run bash
```

It's also possible to run a shell as root:

```
yarn docker:run --user root bash
```

### Change the listening port

Similarly this is how we can change the listening port:

```
yarn docker:run -p <local port>
```

### Run ready-to-use profiler server images

He images we use for production [are public](https://hub.docker.com/r/mozilla/profiler-server/tags),
you can pull latest versions with:

- for master: `docker pull mozilla/profiler-server:master-latest`
- for production: `docker pull mozilla/profiler-server:production-latest`

Then run them with the command `node bin/docker-run <name of the image>`.

### Stopping the docker container

With the command `docker ps` you can find out which containers are currently
running, as well as their names. Then `docker stop <container name>` will stop
it properly.

When using the default commands `yarn docker:run` or `yarn docker:run:detached`,
the container is called `profiler-server` and is stopped using `yarn docker:stop`.

### Cheat sheet

- `docker ps` shows the running containers
- `docker image ls` or `docker images` shows the images on your system
- `docker image rm <image...>` deletes images
- `docker container ls --all` or `docker ps --all` shows all the containers on
  your system
- `docker container stop <container...>` stops the container. It will be deleted
  automatically only if `--rm` was used when starting it.
- `docker container rm <container...>` deletes containers
