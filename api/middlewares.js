const CONSTS = require("./consts.js");

module.exports = function(config) {
    return function(req, res, next) {
        const apiKey = config.apiKey;
        const requestApiKey = req.params.apiKey;
        const endpoint = req.path;
        const isSecured = CONSTS.SECURED_ENDPOINTS.includes(endpoint);
        const hasConfigredApiKey = apiKey && apiKey.length > 0;
        const validApiKey = hasConfigredApiKey && apiKey === requestApiKey;
        const isAuthorizedRequest = !isSecured || validApiKey;
        
        if(isAuthorizedRequest) {
            return next();

        } else {
            console.log(`Invalid API Key: ${requestApiKey}`);
            res.status(401).send({ error: 'Invalid API Key' });
        }
    };
  };