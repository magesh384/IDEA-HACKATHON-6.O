// Wraps async route handlers so rejected promises are forwarded to Express's error middleware
module.exports = function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
