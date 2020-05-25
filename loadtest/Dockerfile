# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#
# This is part of the project Firefox Profiler.
#
# This file can be run standalone and should work from any state of the working
# directory. It's configured so that molotov is the entry point, and has
# defaults parameters to run the publish.py script in a ramping up behavior.
# No API endpoint is configured by default, so you need to provide one at
# runtime with the env variable API_ENDPOINT.

# Setup a container and download the project in it
# We set up a python 3 running in latest Debian stable called buster, in the
# "slim" flavor because we don't need the big version.
FROM python:3-slim-buster

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
# - git, as we'll need it to pull molotov
RUN apt-get update \
  && apt-get install -y --no-install-recommends git \
# and clean the downloaded lists so that they don't increase the layer size.
  && rm -rf /var/lib/apt/lists/*

# Copy over all the code from the working directory. venv is ignored.
COPY --chown=app:app . /app
RUN ls -la /app

# Now we'll start building for real, we don't want to do that as root so let's
# change the user and the workdir.
USER app
WORKDIR /app

RUN python --version

RUN pip install -r requirements.txt --no-warn-script-location

# Output the directory content for a visual check.
RUN ls -la

# Lastly configure the command to be run in this docker.
ENTRYPOINT ["/app/.local/bin/molotov"]
CMD ["--sizing", "publish.py"]
