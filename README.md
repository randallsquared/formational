# async form parsing

`Formational` is an opinionated async wrapper around [busboy](https://www.npmjs.com/package/busboy), processing both `multipart/form-data` and `application/x-www-form-urlencoded` into objects, one each for `query`, `body`, and `files`, if given an `http.IncomingMessage`, or `vars` and `files` if given any other parseable entity.  It uses [append-field](https://www.npmjs.com/package/append-field) to parse forms into nice objects like you're used to.

## Usage

Use `Formational` to wrap your handler:

```js
const formational = require('formational');
const micro = require('micro');

const options = {};

const handler = async (req, res) => `Hello, ${req.query.name}!`;
// called with `?name=Randall` outputs `Hello, Randall!`

module.exports = formational.wrap(handler, options);

```

Use `Formational` to just parse a query string you got elsewhere:


```js
const formational = require('formational');
const micro = require('micro');

const options = {};

const query = '?whatever=1'

formational.parse(query).then(({ vars }) => {
  // do something with `vars`
};
// vars = {whatever: '1'}

```

Two things to note, here:

1. `parse()` takes a string, Buffer, or stream, and outputs an object with two keys, `files` and `vars`.  `handle()` takes a node `http.IncomingMessage` and outputs that same `IncomingMessage` with three keys, `files`, `body`, and `query`. `wrap()` provides your wrapped handler with a first argument which is the output of `handle()`, and passes through any other arguments.
1. The content-type defaults to urlencoded if not given in `options.headers['content-type']`.

## Options

Options can be set when parsing, at the object level, or at the module level.  When requiring `Formational`, a parser is returned with default options.  You can view or change those options for the current parser through the `options([options])` method, or view or change the module-level options through the `defaults([options])` method.  Newly created parsers (through `new formational.constructor()`) will inherit the module-level options as their own parser-level options.  Each parsing method can take a second argument of options to override parser and module options for this call only.  An exception to this hierarchy is that `http.IncomingMessage` objects' headers will override the module and parser options, but not per-call options.

### expect

If an `expect` object is present, and if it has keys, each of `body`, `files`, `query`, and `vars` will be parsed only if it is defined on `expect`.  An `expect` of `{body: true, query: true, vars: true}` will result in no files being parsed, but silently discarded if they exist.

> Default: undefined

### result

If a `result` object is present, and if it has `body`, `files`, `query`, or `vars` keys, the corresponding object will be used as the starting object instead of `Object.assign(null)`.  This can be handy for providing default values, but note that setting an object on the module or parser level may cause more than one request to reuse the same starting object, so this is probably more useful on the call level.  Alternatively, if a function is provided, the function will be called and the returned object used.  This method of using `result` is more likely to provide joy on the parser or module level (or with `wrap`).

> Default: undefined

### save

If a `save` string is present, it will be used as the path under which to save files.  Not providing this directs files to be returned in memory as `Buffer`s; there is no default save path.

> Default: undefined

### headers

If a `headers` object is present, it will be used as headers provided as part of busboy's options.  This is mostly useful for the `'content-type'` header.  To make parsing arbitrary strings, streams, or Buffers easier, this defaults to urlencoded.

> Default: `{'content-type': 'application/x-www-form-urlencoded'}`

### other

Other options may be provided as required by `busboy`; the options object is passed on.

## Methods

### `defaults([opts])`

If called with an argument, sets the module options to that argument.

Returns the module options.

### `options([opts])`

If called with an argument, sets the current parser's options to that argument.

Returns the current parser's options.

### `async wrap(func[, options])`

Given a function, returns an async function which, when called with a `http.IncomingMessage` as the first argument, calls the original function after parsing forms from the request.  Any other arguments (`res`, etc) are passed along unchanged.

Also can take an options object to override parser and module defaults for each call.

### `async query(req[, options])`

Given an object with a key `url` which is understood by node's `querystring` library, returns an object with a key `query` that contains the parsed form.

Also can take an options object to override parser and module defaults.

### `async body(req[, options])`

Given a stream, will return an object with `body` and `files` parsed from the stream.  If the stream object has a key `headers`, as does an `http.IncomingMessage`, it will override parser and module header defaults.

Also can take an options object to override parser and module defaults.  A passed header option will override the streams' own `headers`.

### `async handle(req[, options])`

Given an `http.IncomingMessage`, returns an object with `body`, `files`, and `query` keys corresponding to any parsed files or fields from the body and url of said request.  Errors if not given an `http.IncomingMessage`.

Also can take an options object to override parser and module defaults.
### `async parse(data[, options])`

Given a string, stream, or Buffer, returns an object with `vars` and `files` keys corresponding to any parsed fields and files in the passed data.

Also can take an options object to override parser and module defaults.

## TODO

The main improvement I have in mind is that the `expect` option should allow specifying expected keys, and if expectations exist, we should only pick out those files or fields that are expected.  It would be straightforward to do this for the top level of incoming fields, but if we have a query like `specs[mine][these]=3&specs[yours][other]=4`, specifying that we want the query result to contain only `{specs: { yours: {other: 4 } } }` is harder.  We can use JSON Pointer or JSONPath or similar for specifying the path, but ideally we wouldn't have to build the object and then remove parts.

