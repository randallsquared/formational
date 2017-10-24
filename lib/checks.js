const isStream = require('isstream');
const isString = require('is-string');
const isBuffer = Buffer.isBuffer;

const isArray = (val) => {
  if (val == null) return false;
  if (typeof val !== 'object' || typeof val.push !== 'function') return false;
  return true;
};

const isFunction = (val) => {
  return typeof val === 'function';
};

// Should we ignore this type?  We should if there are expectations for some types but this type is absent.
// An empty object is not "absent", but "anything".
const shouldIgnore = (type, { expect = {} }) => {
  return (Object.keys(expect).length && typeof expect[type] === 'undefined');
};

module.exports = {
  isStream,
  isString,
  isBuffer,
  isArray,
  isFunction,
  shouldIgnore,
}
