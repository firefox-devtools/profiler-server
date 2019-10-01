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

function checkEnvironment() {
  const isRunningInCircleCi = process.env.CIRCLECI === 'true';
  if (!isRunningInCircleCi) {
    throw new Error(
      'This script will not work correctly outside of a CircleCI environment.'
    );
  }

  const isAtGitRoot = fs.existsSync('.git');
  if (!isAtGitRoot) {
    throw new Error('This script must be run at the root of the repository.');
  }
}

function writeVersionFile() {
  // Note: we don't use CIRCLE_REPOSITORY_URL directly, because this gives a ssh
  // URL. That's why we compose the URL manually.
  const projectUsername = process.env.CIRCLE_PROJECT_USERNAME || '';
  const projectReponame = process.env.CIRCLE_PROJECT_REPONAME || '';
  const repositoryUrl = `https://github.com/${projectUsername}/${projectReponame}`;

  const commitHash = process.env.CIRCLE_SHA1;
  const buildUrl = process.env.CIRCLE_BUILD_URL;
  const version = '';
  const distDir = 'dist';
  const targetName = path.join(distDir, 'version.json');

  const versionObject = {
    source: repositoryUrl,
    version: version,
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
