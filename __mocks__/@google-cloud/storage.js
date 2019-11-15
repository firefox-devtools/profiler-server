// @flow
// This was mostly stolen from https://gist.github.com/nfarina/90ba99a5187113900c86289e67586aaa.
// And then rewritten to remove the dependency to stream-buffers and add the
// `exists` method.
// Thanks!

//
// Quick & Dirty Google Cloud Storage emulator for tests.
//
// `new MockStorage().bucket('my-bucket').file('my_file').createWriteStream()`
//

import { Readable } from 'stream';
import { Concatenator } from '../../src/utils/streams';

class MockStorage {
  static buckets: { [name: string]: MockBucket } = {};
  static cleanUp() {
    this.buckets = {};
  }

  bucket(name: string) {
    return (
      MockStorage.buckets[name] ||
      (MockStorage.buckets[name] = new MockBucket(name))
    );
  }
}

class MockBucket {
  name: string;
  files: { [path: string]: MockFile };

  constructor(name: string) {
    this.name = name;
    this.files = {};
  }

  file(path: string) {
    return this.files[path] || (this.files[path] = new MockFile(path));
  }
}

type Metadata = {
  +metadata: { ... },
  ...
};

class MockFile {
  name: string;
  contents: Buffer;
  metadata: Metadata;

  constructor(name: string) {
    this.name = name;
    this.contents = Buffer.alloc(0);
    this.metadata = {};
  }

  get() {
    return [this, this.metadata];
  }

  setMetadata(metadata: Metadata) {
    const customMetadata = { ...this.metadata.metadata, ...metadata.metadata };
    this.metadata = { ...this.metadata, ...metadata, metadata: customMetadata };
  }

  createReadStream() {
    const readable = new Readable({ autoDestroy: true });
    readable.push(this.contents);
    readable.push(null);
    return readable;
  }

  createWriteStream({ metadata }: Object) {
    this.setMetadata(metadata);
    const writable = new Concatenator();
    writable.on('finish', () => {
      this.contents = writable.transferContents();
      writable.destroy();
    });
    return writable;
  }
}

export { MockStorage as Storage, MockBucket as Bucket, MockFile as File };
