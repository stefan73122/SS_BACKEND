const requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 1;

const requestQueueMiddleware = (req, res, next) => {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    
    res.on('finish', () => {
      activeRequests--;
      processQueue();
    });
    
    res.on('close', () => {
      activeRequests--;
      processQueue();
    });
    
    next();
  } else {
    requestQueue.push({ req, res, next });
  }
};

const processQueue = () => {
  if (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const { req, res, next } = requestQueue.shift();
    activeRequests++;
    
    res.on('finish', () => {
      activeRequests--;
      processQueue();
    });
    
    res.on('close', () => {
      activeRequests--;
      processQueue();
    });
    
    next();
  }
};

module.exports = requestQueueMiddleware;
