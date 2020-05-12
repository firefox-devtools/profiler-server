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
`yarn docker:run` is a shortcut for:
```
docker run -t -i -p 8000:8000 --rm --name profiler-server profiler-server:dev
```
Here is a quick explanation of the command line parameters:
* `-t` allocates a pseudo-tty, while `-i` makes the container interactive. These
  two parameters makes it possible to interact with the container. Especially
  Ctrl-C can gracefully stop the container.
* `-p 8000:8000` makes the container listen on port 8000, and binds it to the
  inner port 8000 which is the default port configured while building the
  container. (Please see below to change this port.)
* `--rm` removes the container when it stops.
* `--name` name this container so that it's easier to reference in commands.

### Running a shell in the image
It's easy to run a bash shell as the running user:
```
yarn docker:run bash
```
It's possible but less easy to run a shell as root:
```
docker run -t -i --rm -u root profiler-server:dev bash
```

### Change the listening port
Similarly this is how we can change the listening port:
```
docker run -t -i -p <local port>:8000 --rm profiler-server:dev
```
where `<local port>` can also be a range of ports, so that it will use the first
available port in the range. Then `docker ps` will show which port is used for
this container.

### Stopping the docker container

With the command `docker ps` you can find out which containers are currently
running, as well as their names. Then `docker stop <container name>` will stop
it properly.

When using the default commands `yarn docker:run` or `yarn docker:run:detached`,
the container is called `profiler-server` and is stopped using `yarn docker:stop`.

### Cheat sheet
* `docker ps` shows the running containers
* `docker image ls` or `docker images` shows the images on your system
* `docker image rm <image...>` deletes images
* `docker container ls --all` or `docker ps --all` shows all the containers on
  your system
* `docker container stop <container...>` stops the container. It will be deleted
  automatically only if `--rm` was used when starting it.
* `docker container rm <container...>` deletes containers

