#!/bin/sh

# Prerequisites:
# * installation steps in loadtest/README.md have been followed.
# * using a connection capable to upload at 50 MBits/s to the servers. A fiber connection is a must.

# Exit on error
set -e

# Display all commands (for debugging)
#set -x

# Constants
STAGE_SERVER=https://stage.firefoxprofiler.nonprod.cloudops.mozgcp.net
DEV_SERVER=https://dev.firefoxprofiler.nonprod.cloudops.mozgcp.net

### First, let's check the prerequisites.
if [ ! -d loadtest/venv ] ; then
  echo "The python virtualenv seems to be missing." 1>&2
  echo "Please run the instructions in the install section of loadtest/README.md and run this script again." 1>&2
  exit 1
fi

echo "This script will run a large number of requests on both staging and dev environments."
printf "Are you sure?"
# shellcheck disable=SC2034
read -r enter

### And now, let's move on with the actual tasks.

# A utility function to run the tests. Note that using () we spawn a subshell so
# that directory changes are undone after the function returns.
# This function needs to be run with the API_ENDPOINT env variable to designate
# the target server.
run_tests() (
  cd loadtest
  # shellcheck disable=SC1091
  . venv/bin/activate

  echo ">>> Ramp up"
  echo "Do not pay attention to the results for this run."
  molotov -w 200 -d 300 --ramp-up 60 publish_short_requests.py

  echo ">>> Run a load test operation: 200 clients during 5 minutes (1/3)"
  molotov -w 200 -d 300 publish_short_requests.py

  echo ">>> Run a load test operation: 200 clients during 5 minutes (2/3)"
  molotov -w 200 -d 300 publish_short_requests.py

  echo ">>> Run a load test operation: 200 clients during 5 minutes (3/3)"
  molotov -w 200 -d 300 publish_short_requests.py
)

echo ">>>>>>>>>>> Stage Server (production code in a sandbox environment) <<<<<<<<<<<<<"
API_ENDPOINT=$STAGE_SERVER run_tests
echo ">>>>>>>>>>> Dev Server (code from the main branch in a sandbox environment) <<<<<<<<<<<<<"
API_ENDPOINT=$DEV_SERVER run_tests

echo ">>>>>>>>>>> Load testing ended <<<<<<<<<<<<<"
echo "Do not forget to clean up the buckets with commands:"
echo "gsutil -m rm gs://moz-fx-stage-firefoxprofiler-bucket/*"
echo "gsutil -m rm gs://moz-fx-dev-firefoxprofiler-bucket/*"
echo "You need to run 'gcloud config' to log in first, if that's not done. See https://cloud.google.com/storage/docs/quickstart-gsutil for more information"
