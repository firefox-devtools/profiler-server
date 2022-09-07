/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @ts-check

// This file is used to run profiler server docker images in new containers. We
// have to use this moderately complex script because handling of the --mount
// option is complex.
//
// Find the full usage with this command:
// node bin/docker-run --help
//
// One interesting characteristic is that, contrary to the normal `docker run`
// command, some special-cased options are available and can be used at any
// location, especially after the image-name.

require('dotenv').config();
const { execFileSync } = require('child_process');
const fs = require('fs');

const { GCS_AUTHENTICATION_PATH: gcsAuthenticationPath } = process.env;

const dockerArgs = [
  'run',
  // -t and -i work together to make it possible to CTRL-C the server
  '-t', // Allocate a TTY.
  '-i', // Interactive session.
  // Remove the newly created container after it's stopped.
  '--rm',
  // Import environment variables from the file .env.
  '--env-file',
  '.env',
];

if (gcsAuthenticationPath && fs.existsSync(gcsAuthenticationPath)) {
  // To authenticate with Google Cloud Storage we use an external file. As a
  // result this needs to be mounted inside the docker instance using the
  // parameter --mount.

  // However, the value to use is defined locally in a .env file, that's why we
  // use this simple script to read it and output the parameter option, if the
  // value is defined (by the value GCS_AUTHENTICATION_PATH).
  dockerArgs.push(
    '--mount',
    'type=bind,' +
      `source=${gcsAuthenticationPath},` +
      `destination=${gcsAuthenticationPath},` +
      'readonly'
  );
}

// First 2 args are the node executable and the script itself. Let's look at
// what's after.
const scriptArgs = process.argv.slice(2);

if (scriptArgs.includes('--help')) {
  console.log(
    'Usage: node bin/docker-run [--name <name>] [--detach] [--user <user>] [-p [<local ip>:]<local port>] image-name [command and args]'
  );
  console.log(
    'One interesting characteristic is that, contrary to the normal `docker run` ' +
      'command, here the known options are special-cased and can be ' +
      'used at any location, especially after the image-name.'
  );
  process.exit();
}

// We special case --detach and --name, and otherwise just pass through other
// parameters to the docker run command.
const detachIndex = scriptArgs.indexOf('--detach');
if (detachIndex >= 0) {
  // This is used when we want to deteah the newly created container, and run it
  // in background. This can be reattached with `docker attach`.`
  scriptArgs.splice(detachIndex, 1);
  dockerArgs.push('--detach');
}

const nameIndex = scriptArgs.indexOf('--name');
if (nameIndex >= 0) {
  // This names the newly created container so that we can use it in following
  // commands.
  const nameArgs = scriptArgs.splice(nameIndex, 2);
  dockerArgs.push(...nameArgs);
}

const userIndex = scriptArgs.indexOf('--user');
if (userIndex >= 0) {
  // This runs the command with a specific user name.
  const userArgs = scriptArgs.splice(userIndex, 2);
  dockerArgs.push(...userArgs);
}

const portIndex = scriptArgs.indexOf('-p');
if (portIndex >= 0) {
  // This binds the server to other ports than the default.
  const portArgs = scriptArgs.splice(portIndex, 2);
  dockerArgs.push('-p', `${portArgs[1]}:8000`);
} else {
  // Expose the port 8000.
  dockerArgs.push('-p', '8000:8000');
}

if (scriptArgs.length === 0) {
  throw new Error('Please provide at least an image name to execute.');
}

// All other passed arguments are passed through.
dockerArgs.push(...scriptArgs);

console.log(`$ docker ${dockerArgs.join(' ')}`);
execFileSync('docker', dockerArgs, { stdio: 'inherit' });
