#! /usr/bin/env node
// @flow

const crypto = require('crypto');
const fs = require('fs');
const { createGzip } = require('zlib');
const Stream = require('stream');
const util = require('util');

const { Readable } = Stream;
const finished = util.promisify(Stream.finished);

function printUsageAndExit() {
  console.log(
    'Generates a json file with a lot of random data until the requested size is reached.'
  );
  console.log(
    '`.gz` will be appended to the file name if not already present.\n'
  );
  console.log('Usage: generate-file.js <approximate-file-length> <file-name>');
  console.log(
    'approximate-file-length can use a suffix: k/K (*1024) or m/M (*1024^2)'
  );
  process.exit(-1);
}

function lengthFromArgs(aLength /*: ?string */) /*: number */ {
  if (!aLength) {
    throw printUsageAndExit(); // Throwing because Flow doesn't know that the function will exit.
  }

  const lengthArgsRe = /^(\d+)(K|M)?$/i; // 5, 6, 10000, 10k, 10K, 10m, 10M
  const matchResult = lengthArgsRe.exec(aLength);
  if (!matchResult) {
    throw printUsageAndExit(); // Throwing because Flow doesn't know that the function will exit.
  }

  const [, strFaceValue, unit] = matchResult;
  let faceValue = +strFaceValue;
  if (unit) {
    const lowerCasedUnit = unit.toLowerCase();
    if (lowerCasedUnit === 'k') {
      faceValue *= 1024;
    } else if (lowerCasedUnit === 'm') {
      faceValue *= 1024 * 1024;
    }
  }
  return faceValue;
}

function fileNameFromArgs(fileName) {
  if (!fileName) {
    throw printUsageAndExit();
  }

  if (!fileName.endsWith('.gz')) {
    return fileName + '.gz';
  }

  return fileName;
}

function getRandomStringReadable() {
  return new Readable({
    // Flow libdefs make the number optional when it's really not.
    // See https://github.com/facebook/flow/pull/8385
    read(size /*: ?number */) {
      const pushData = (size /*: number */) => {
        crypto.randomBytes(Math.ceil(size * 0.5), (err, buffer) => {
          if (err) {
            this.destroy(err);
            return;
          }
          const string = buffer.toString('hex');
          const shouldPushAgain = this.push(string);
          if (shouldPushAgain) {
            pushData(1024);
          }
        });
      };

      if (typeof size !== 'number') {
        this.destroy(
          new Error(
            `'read' has been called with a non-number ${String(
              size
            )}, is that normal?`
          )
        );
        return;
      }

      pushData(size);
    },
  });
}

function handleEventsOnStreams(...streams) {
  const allFinished = streams.map((stream) => finished(stream));
  return Promise.all(allFinished).then(
    () => {}, // Nothing to do when everything is fine.
    (err) => {
      // One of the streams errored, clean things up
      streams.forEach((stream) => stream.destroy(err));
      // But forward the error
      throw err;
    }
  );
}

async function run() {
  const length = lengthFromArgs(process.argv[2]);
  const fileName = fileNameFromArgs(process.argv[3]);
  const randomStringReadable = getRandomStringReadable();
  const gzipTransform = createGzip({ level: 1 }); // fast compression
  const fileWriteStream = fs.createWriteStream(fileName);
  handleEventsOnStreams(
    randomStringReadable,
    gzipTransform,
    fileWriteStream
  ).catch((error) => {
    console.error('An error was thrown during the process:');
    console.error(error);
    process.exit(1);
  });

  // Pipe the gzip transform directly to the fileWriteStream.
  gzipTransform.pipe(fileWriteStream);

  // Write the prelude
  gzipTransform.write('{"foo":"');

  // Pipe some randomness until we have enough data
  randomStringReadable.pipe(gzipTransform);

  await new Promise((resolve) => {
    gzipTransform.on('data', () => {
      // Checking what we wrote already
      if (
        fileWriteStream.bytesWritten + fileWriteStream.writableLength >=
        length
      ) {
        // We got the data we wanted, let's stop the drain!
        resolve();
      }
    });
  });

  // End it now.
  randomStringReadable.unpipe(gzipTransform);
  gzipTransform.end('"}');

  // And wait until everything is done.
  await finished(fileWriteStream);

  console.log(`Data has been successfully written in file ${fileName}!`);
}

run().catch((error) => {
  console.error('An error was thrown during the process:');
  console.error(error);
  process.exit(1);
});
