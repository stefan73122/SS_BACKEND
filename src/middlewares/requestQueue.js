const requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 1;

const attachDoneHandler = (res, handler) => {
  res.on('finish', handler);
  res.on('close', handler);
};

const requestQueueMiddleware = (req, res, next) => {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      activeRequests--;
      processQueue();
    };

    attachDoneHandler(res, release);
    next();
  } else {
    requestQueue.push({ req, res, next });
  }
};

const processQueue = () => {
  if (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const { req, res, next } = requestQueue.shift();
    activeRequests++;

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      activeRequests--;
      processQueue();
    };

    attachDoneHandler(res, release);
    next();
  }
};

module.exports = requestQueueMiddleware;
