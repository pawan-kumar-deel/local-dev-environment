/**
 * Global error handler middleware
 * @param {Error} err - The error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  // Check if the error has a status code
  const statusCode = err.status || 500;
  
  // Send a structured error response
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    details: err.details || null,
    path: req.path
  });
}

module.exports = errorHandler;