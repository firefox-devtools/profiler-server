/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

/* This script generates the version file, as requested by the dockerflow
 * requirements described in
 * https://github.com/mozilla-services/Dockerflow/blob/master/docs/version_object.md.
 * It uses the environment variables set by CircleCI.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const packageJson = require('../package.json');

function checkEnvironment() {
  // Let's check that we have our needed environment variable.
  if (!process.env.CIRCLE_BUILD_URL) {
    throw new Error(
      'The environment variable CIRCLE_BUILD_URL is missing. Are we running in CircleCI?'
    );
  }

  console.log('All needed environment variables have been found, good!');

  const isAtGitRoot = fs.existsSync('.git');
  if (!isAtGitRoot) {
    throw new Error('This script must be run at the root of the repository.');
  }

  console.log('We are in the root directory, good!');
}

function getGitCommitHash() /*: string */ {
  const hash = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  });
  // Because execFileSync can return both a string or a buffer depending on the
  // `encoding` option, Flow isn't happy about calling `trim` on it. But _we_
  // know that it's a string.
  // $FlowExpectError
  return hash.trim();
}

function writeVersionFile() {
  const repositoryUrl = packageJson.repository;

  const commitHash = getGitCommitHash();
  const buildUrl = process.env.CIRCLE_BUILD_URL;
  const version = ''; // TODO: generate a proper version when we're on a tag
  const distDir = 'dist';
  const targetName = path.join(distDir, 'version.json');

  const versionObject = {
    source: repositoryUrl,
    version,
    commit: commitHash,
    build: buildUrl,
  };

  console.log(`Writing to ${targetName}:`);
  console.log(versionObject);

  // When using `recursive`, there's no error when the directory already exists.
  // This makes it simpler.
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(
    targetName,
    JSON.stringify(versionObject, null, /* indent */ 2)
  );
}

checkEnvironment();
writeVersionFile();
