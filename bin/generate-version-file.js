/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @ts-check

/* This script generates the version file, as requested by the dockerflow
 * requirements described in
 * https://github.com/mozilla-services/Dockerflow/blob/master/docs/version_object.md.
 * It uses the environment variables set by GitHub Actions.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const packageJson = require('../package.json');

function checkEnvironment() {
  // Let's check that we have our needed environment variable.
  if (!process.env.BUILD_URL) {
    throw new Error(
      'The environment variable BUILD_URL is missing. Are we running in GitHub Actions?'
    );
  }

  console.log('All needed environment variables have been found, good!');

  const isAtGitRoot = fs.existsSync('.git');
  if (!isAtGitRoot) {
    throw new Error('This script must be run at the root of the repository.');
  }

  console.log('We are in the root directory, good!');
}

function getGitCommitHash() {
  const hash = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  });
  return hash.trim();
}

function findLocalBranch() {
  const branch = execFileSync(
    'git',
    ['symbolic-ref', '--short', '-q', 'HEAD'],
    {
      encoding: 'utf8',
    }
  );
  return branch.trim();
}

function writeVersionFile() {
  const repositoryUrl = packageJson.repository;

  const commitHash = getGitCommitHash();
  const branch = findLocalBranch();
  const buildUrl = process.env.BUILD_URL || '';
  // Currently we generate the version from the build url. We're confident this
  // is always increasing, but for sure this isn't monotonic. In the future we
  // might want to use a tag instead.
  const buildNumResult = /\d+$/.exec(buildUrl);
  if (!buildNumResult) {
    throw new Error(
      `We couldn't extract a build num from the build URL, this shouldn't happen. The full build url is: ${buildUrl}.`
    );
  }
  // Please keep it in sync with the version used for the docker image in
  // .github/workflows/weekly-docker.yml.
  const version = `0.1.${buildNumResult[0]}`;
  const distDir = 'dist';
  const targetName = path.join(distDir, 'version.json');

  const versionObject = {
    source: repositoryUrl,
    version,
    commit: commitHash,
    build: buildUrl,
    date: new Date().toISOString(),
    branch,
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
