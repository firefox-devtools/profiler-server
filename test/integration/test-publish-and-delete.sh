#!/bin/sh

# Prerequisites:
# * installation steps in loadtest/README.md have been followed.
# * dependencies have been installed with `yarn`.
# * the server is locally configured with a .env pointing to an existing google
#   storage bucket with the appropriate permissions.

# Exit on error
set -e

# Display all commands (for debugging)
#set -x

### First, let's check the prerequisites.
if [ ! -d loadtest/venv ] ; then
  echo "The python virtualenv seems to be missing." 1>&2
  echo "Please run the instructions in the install section of loadtest/README.md and run this script again." 1>&2
  exit 1
fi

### And now, let's move on with the actual tasks.

echo ">>> Starting the server."
node_modules/.bin/babel-node --extensions ".ts" src/index.ts &
server_pid=$!

cleanup() {
  echo ">>> Stopping the server."
  # babel-node doesn't forward the TERM signal, see https://github.com/babel/babel/pull/13784
  kill -INT $server_pid
}

# Execute the cleanup function when exiting (either normally or when
# encountering an error thanks to `set -e` above).
trap cleanup EXIT

echo ">>> Waiting that the server starts."
while ! curl -i --silent -S --show-error --fail http://localhost:5252/__lbheartbeat__  1> /dev/null ; do
  sleep 1
done

echo ">>> Running a molotov scenario"
(
  cd loadtest
  # shellcheck disable=SC1091
  . venv/bin/activate
  API_ENDPOINT=http://localhost:5252 molotov --single-mode publish_and_delete -r 1 --fail 1 publish.py
)
