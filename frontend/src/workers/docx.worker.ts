import { Unzip, UnzipInflate } from 'fflate';

// Parse only the main XML part. Ignore images, macros, relationships and embedded files.
self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try {
    const data = new Uint8Array(event.data);
    let found = false;
    let total = 0;
    let xml: string | undefined;
    const chunks: Uint8Array[] = [];
    const unzip = new Unzip((file) => {
      if (file.name !== 'word/document.xml') return;
      if (found || (file.originalSize || 0) > 2_000_000) throw new Error('limit');
      found = true;
      file.ondata = (error, chunk, final) => {
        if (error) throw error;
        total += chunk.length;
        if (total > 2_000_000) {
          file.terminate();
          throw new Error('limit');
        }
        chunks.push(chunk);
        if (final) {
          const result = new Uint8Array(total);
          let offset = 0;
          for (const item of chunks) {
            result.set(item, offset);
            offset += item.length;
          }
          xml = new TextDecoder('utf-8', { fatal: true }).decode(result);
        }
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    for (let offset = 0; offset < data.length; offset += 8192)
      unzip.push(data.subarray(offset, offset + 8192), offset + 8192 >= data.length);
    if (!found || !xml) throw new Error('invalid');
    self.postMessage({ xml });
  } catch {
    self.postMessage({ error: true });
  }
};
