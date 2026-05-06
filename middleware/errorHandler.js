function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0];
        const message = field === 'name' 
            ? 'এই নাম, ক্লাস এবং স্ট্রিম দিয়ে ইতিমধ্যে একটি ব্যাচ আছে'
            : 'Duplicate entry found';
        return res.status(409).json({ error: message });
    }
    
    // Never expose stack traces to client
    const message = status < 500 ? err.message : 'Internal server error';
    if (status >= 500) {
        console.error('[Server Error]', err);
    }
    res.status(status).json({ error: message, ...(err.details && { details: err.details }) });
}

module.exports = errorHandler;
