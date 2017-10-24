
const consolidate = (form, ...opts) => {
  opts.unshift(form.defaults(), form.options());
  return Object.assign(Object.create(null), ...opts);
};

const masquerade = (type, options) => {
  // let's make sure we convey expectations into the only-knows-from-vars stream_into_form
  if (options.expect && options.expect[type]) {
    options.expect.vars = options.expect[type];
  }
  // and any given starting objects, too.
  if (options.result && options.result[type]) {
    options.result.vars = options.result[type];
  }
  return options;
};

module.exports = { consolidate, masquerade };
