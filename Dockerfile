# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#
# This is part of the project Firefox Profiler.
#
# This file can be run standalone and should work from any state of the working
# directory. The command `yarn docker:build` will build a tagged image.
# Then the command `yarn docker:run` will conveniently execute the image. It's
# possible to pass extra arguments to this command to execute another program
# instead of the default. See docs-developer/docker.md for more information.

# Setup a container and build the project in it
# We set up a node 10 running in latest Debian stable called buster, in the
# "slim" flavor because we don't need the big version.
FROM node:14-buster-slim AS builder

# Create the user we'll run the build commands with. Its home is configured to
# be the directory /app. It helps avoiding warnings when running tests and
# building the app later.
RUN set -x \
  && groupadd --gid 10001 app \
  && useradd -M -d /app --uid 10001 --gid 10001 app

# Create the app's directory where we'll build everything.
RUN mkdir /app \
  && chown app:app /app

# Install various needed packages:
# - git, as we'll need it to generate the version file later on.
# - python, as we need it to build fast-crc32c when installing with yarn later.
# - build-essential, that installs all build tools for the same reason.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git python build-essential flake8 \
# and clean the downloaded lists so that they don't increase the layer size.
  && rm -rf /var/lib/apt/lists/*

# Copy over all the code from the working directory. node_modules is copied as
# well so that `yarn` shouldn't download the world when building from a working
# directory where dependencies are already installed.
COPY --chown=app:app . /app
RUN ls -la /app

# Now we'll start building for real, we don't want to do that as root so let's
# change the user and the workdir.
USER app
WORKDIR /app

RUN node -v
RUN yarn -v

# This environment variable from CircleCI is needed when generating the
# version file. We pass it using the "arguments" mechanism from docker.
ARG circle_build_url
ENV CIRCLE_BUILD_URL=${circle_build_url}

# We run all these commands in one RUN command. The reason is that we don't save
# the development dependencies in a layer, and we can also keep yarn's cache
# accross `yarn install` invocations without saving it either.
# This greatly reduces the builder container size and makes things generally
# faster.
RUN set -x \
# Install the dependencies, including dev dependencies.
  && yarn install --frozen-lockfile \
# Run tests
# Note we don't use test-all because we don't want to start the flow server. So
# we run all test commands separately.
  && yarn flow:ci \
  && yarn lint \
  && yarn test-lockfile \
  && yarn test \
# Actually build the project.
  && yarn build:clean \
  && NODE_ENV=production yarn build \
# This script doesn't work outside of CircleCI
  && if [ -n "$CIRCLE_BUILD_URL" ] ; then yarn generate-version-file ; fi \
# Then keep only prod dependencies, that we'll copy over to the runtime
# container in the next phase.
  && yarn install --frozen-lockfile --prod \
# Finally clean yarn's cache so that it's not saved in the layer.
  && yarn cache clean

# Display to the console how much space node_modules takes. This is a useful
# information to know if we only have the prod dependencies as we should.
RUN du -khs node_modules

# Output the directory content for a visual check.
RUN ls -la

# ----- And now, let's build the runtime container -----
FROM node:14-buster-slim
ENV NODE_ENV="production"
ENV PORT=8000

# We create the runtime user.
RUN set -x \
  && groupadd --gid 10001 app \
  && useradd -M --uid 10001 --gid 10001 app
RUN mkdir /app
# Note that we don't chown the directory here, on purpose: the "app" user
# shouldn't own the files so that they're only readable but not writable by this
# user. The files will be owned by "root".

# Install curl as we'll need it to assert that the server runs properly.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
# and clean the downloaded lists so that they don't increase the layer size.
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/dist /app
COPY --from=builder /app/node_modules /app/node_modules

# Output the directory content for a visual check.
RUN ls -la

# This is the default port as configured above.
EXPOSE ${PORT}

# Lastly configure the command to be run in this docker.
USER app
CMD ["node", "index.js"]

# This health check command can help know when the server is down
HEALTHCHECK --interval=1m --timeout=3s \
  CMD curl --silent --show-error --fail http://localhost:8000/__lbheartbeat__ || exit 1
