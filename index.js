
const { parse } = require('url');
const { ReadableStreamBuffer } = require('stream-buffers');
const { IncomingMessage } = require('http');
const { isStream, isString, isBuffer, isArray, isFunction, shouldIgnore } = require('./lib/checks');
const { consolidate, masquerade } = require('./lib/options');
const stream_into_form = require('./lib/streamparser');

// we have require-level options that are defaults for all created Formationals.
// we have object-level options that are defaults for all handle operations by a given Formational, and supersede require-level options.
// we have handle-level options that apply only to this call, and supersede object-level options
const global_options = Object.create(null);
global_options.headers = Object.create(null);
global_options.headers['content-type'] = 'application/x-www-form-urlencoded';

class Formational {
  constructor(opts) {
    this.opts = opts ? opts : global_options;
  }

  defaults(opts = null) {
    if (opts) global_options = opts;
    return global_options;
  }

  options(opts = null) {
    if (opts) this.opts = opts;
    return this.opts;
  }

  wrap(func, options) {
    return async (req, ...others) => {
      return func(await this.handle(req, options), ...others);
    }
  }

  async query(req, options) {
    const query = parse(req.url).query;
    if (!query || shouldIgnore('query', options)) return { query: {} };
    const ctype_header = { headers: { 'content-type': 'application/x-www-form-urlencoded' } };
    const input_options = consolidate(this, options, ctype_header);
    const masqed_options = masquerade('query', input_options);
    const parsed = await this.parse(query, masqed_options);
    return { query: parsed.vars };
  }

  async body(req, options) {
    const input_options = consolidate(this, (req.headers ? { headers: req.headers } : {}), options);
    if (!input_options.headers['content-type']) return { body: {}, files: {} };
    const masqed_options = masquerade('body', input_options);
    const result = await this.parse(req, masqed_options);
    return { body: result.vars, files: result.files };
  }

  async handle(req, options = {}) {
    if (req instanceof IncomingMessage) {
      return Object.assign(req, await this.body(req, options), await this.query(req, options));
    }
    throw new Error('First argument to `handle` should be an instance of `http.IncomingMessage`.');
  }

  async parse(unk, options = {}) {
    if (isStream(unk)) {
      const input_options = consolidate(this, options);
      return stream_into_form(unk, input_options);
    } else if (isBuffer(unk)) {
      const stream = new ReadableStreamBuffer();
      stream.put(unk);
      stream.stop();
      return this.parse(stream, options);
    } else if (isString(unk)) {
      return this.parse(Buffer.from(unk, 'ascii'), options);
    } else {
      throw new Error('First argument to `parse` should be a string, Buffer, or stream.');
    }
  }


}

const Form = new Formational();

module.exports = Form;

