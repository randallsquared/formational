const Busboy = require('busboy');
const concat = require('concat-stream');
const append_field = require('append-field');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { isFunction, shouldIgnore } = require('./checks');

const append_expected = (obj, fieldname, val, expect = {}) => {
  // TODO: use JSON Pointer to point at a function to filter fields/files
  append_field(obj, fieldname, val);
};

const start_with = (starting) => {
  if (!starting) return Object.create(null);
  if (isFunction(starting)) return starting();
  return starting;
}

// any options we accept must not collide with Busboy options, which are:
// headers, highWaterMark, fileHwm, defCharset, preservePath, limits
module.exports = async (req, options) => {
  const response = new Promise((resolve, reject) => {
    let busboy, cleanedup;
    const vars = start_with(options.result ? options.result.vars : null);
    const files = start_with(options.result ? options.result.files : null);
    const pendingFileSaves = 0;

    try {
      busboy = new Busboy(options);
    } catch (err) {
      // there is nothing to clean up at this point.
      reject(err);
      return;
    }

    const complain = signal => {
      const messages = {
        partsLimit: 'The given part count limit was reached.',
        filesLimit: 'The given file count limit was reached.',
        fieldsLimit: 'The given field count limit was reached.',
        fieldnameLimit: 'The given fieldname limit was reached.',
        fieldsizeLimit: 'The given field size limit was reached.',
      };
      if (messages[signal]) {
        cleanup(new Error(messages[signal]));
      } else {
        cleanup(new Error(`Unknown error happened while parsing: ${signal}`));
      }
      return;
    };

    const cleanup = err => {
      if (cleanedup) return;
      cleanedup = true;

      req.unpipe(busboy);
      req.on('readable', req.read.bind(req));
      busboy.removeAllListeners();

      if (err) {
        reject(err);
        return;
      }

      if (pendingFileSaves) {
        setTimeout(() => cleanup(err), 3);
        return;
      }

      resolve({ vars, files });
    };

    busboy.on('error', cleanup);
    busboy.on('finish', cleanup);
    busboy.on('partsLimit', () => complain('partsLimit'));
    busboy.on('filesLimit', () => complain('filesLimit'));
    busboy.on('fieldsLimit', () => complain('fieldsLimit'));

    if (!shouldIgnore('files', options)) {
      const expect = options.expect && options.expect.files ? options.expect.files : {};
      busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (options.save) {
          const hash = crypto.createHash('sha256');
          hash.update(`${Math.random()}`);
          var saveTo = path.join(options.save, `${hash.digest('hex')}${path.parse(filename).ext}`);
          file.pipe(fs.createWriteStream(saveTo));
          file.on('end', () => {
            const details = { filename, encoding, mimetype, path: saveTo };
            append_expected(files, fieldname, details, expect);
          });
        } else {
          const concatStream = concat(buf => {
            const details = { filename, encoding, mimetype, file: buf };
            append_expected(files, fieldname, details, expect);
          });
          file.pipe(concatStream);
        }
      });
    }

    if (!shouldIgnore('vars', options)) {
      const expect = options.expect && options.expect.vars ? options.expect.vars : {};
      busboy.on('field', (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) => {
        if (fieldnameTruncated) return complain('fieldnameLimit');
        if (valTruncated) return complain('fieldsizeLimit');
        // TODO: figure out what to do with encoding and mimetype here.
        append_expected(vars, fieldname, val, expect);
      });
    }

    req.pipe(busboy);
  });
  return response;
};
