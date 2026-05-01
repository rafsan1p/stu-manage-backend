function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    // Never expose stack traces to client
    const message = status < 500 ? err.message : 'Internal server error';
    if (status >= 500) {
        console.error('[Server Error]', err);
    }
    res.status(status).json({ error: message, ...(err.details && { details: err.details }) });
}

module.exports = errorHandler;
