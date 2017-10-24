const fs = require('fs');
const qs = require('querystring');
const micro = require('micro');
const listen = require('test-listen');
const request = require('request-promise');
const { ReadableStreamBuffer } = require('stream-buffers')
const test = require('ava').test;
const formational = require('../index');
const success = { test: 'success' };
const simpleBody = {
  one: 'first',
  arr: ['a', 'b', 'c'],
  two: 'second',
  other: 'more',
};
const testFilename = `${__dirname}/code-helper.jpg`;
const fileFieldName = 'a_file';

const attachFile = (body, name, filepath) => {
  const copy = Object.assign({}, body);
  copy[name] = fs.createReadStream(filepath);
  return copy;
};

const testRequest = async (handler, options) => {
  const service = micro(handler);
  options.uri = await listen(service);
  options.uri += '?whatever=1';
  const body = await request(options);
  service.close();
  return body;
};

/*

TODO:
  test our options
  test busboy options
*/

test('using default urlencoded parser', async t => {
  const input = qs.stringify(simpleBody);
  const result = await formational.parse(input, {expect: {vars: {one: true}}});
  t.deepEqual(simpleBody, result.vars);
});

test('getting a form from a string', async t => {
  const handler = async (req) => {
    const stream = new ReadableStreamBuffer();
    stream.put(await micro.buffer(req));
    stream.stop();
    const response = await formational.parse(stream, { headers: req.headers });
    t.deepEqual(fs.readFileSync(testFilename), response.files[fileFieldName].file);
    t.deepEqual(simpleBody, response.vars);
    return success;
  };
  const options = { method: 'POST', formData: attachFile(simpleBody, fileFieldName, testFilename) };
  const body = await testRequest(handler, options);
  t.deepEqual(JSON.parse(body).test, 'success');
});

test('getting a form from a buffer', async t => {
  const handler = async (req) => {
    const response = await formational.parse(await micro.buffer(req), { headers: req.headers });
    t.deepEqual(fs.readFileSync(testFilename), response.files[fileFieldName].file);
    t.deepEqual(simpleBody, response.vars);
    return success;
  };
  const options = { method: 'POST', formData: attachFile(simpleBody, fileFieldName, testFilename) };
  const body = await testRequest(handler, options);
  t.deepEqual(JSON.parse(body).test, 'success');
});

test('getting a form from an IncomingMessage', async t => {
  const handler = async (req) => {
    const form = await formational.handle(req);
    t.deepEqual(fs.readFileSync(testFilename), form.files[fileFieldName].file);
    t.deepEqual(simpleBody, form.body);
    return success;
  };
  const options = { method: 'POST', formData: attachFile(simpleBody, fileFieldName, testFilename) };
  const body = await testRequest(handler, options);
  t.deepEqual(JSON.parse(body).test, 'success');
});

test('composing with a micro handler function', async t => {
  const handler = async (req) => {
    t.deepEqual(fs.readFileSync(testFilename), req.files[fileFieldName].file);
    t.deepEqual(simpleBody, req.body);
    return success;
  };
  const options = { method: 'POST', formData: attachFile(simpleBody, fileFieldName, testFilename) };
  const body = await testRequest(await formational.wrap(handler), options);
  t.deepEqual(JSON.parse(body).test, 'success');
});

test('composing with a micro handler function; urlencoded', async t => {
  const handler = async (req) => {
    t.deepEqual(simpleBody, req.body.simpleBody);//req.body);
    return success;
  };
  const options = { method: 'POST', form: { simpleBody, still: 6 } };
  const body = await testRequest(await formational.wrap(handler), options);
  t.deepEqual(JSON.parse(body).test, 'success');
});

test('getting a query from an IncomingMessage', async t => {
  const handler = async (req) => {
    const form = await formational.handle(req);
    t.deepEqual({ whatever: '1' }, form.query);
    return success;
  };
  const options = { method: 'GET' };
  const body = await testRequest(handler, options);
  t.deepEqual(JSON.parse(body).test, 'success');
});
