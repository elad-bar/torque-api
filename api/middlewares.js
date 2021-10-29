const fs = require('fs');
const CONSTS = require("./consts.js");

class APIMiddleware {
    constructor() {
        this.config = null;
        this.enabled = false;
    }

    get devices() {
        return this.config.authentication.devices;
    }

    get apiKey() {
        return this.config.authentication.apiKey;
    }

    Initialize(config) {
        console.info("Initializing ApiKeyMiddleware");

        this.config = config;

        if(this.config && this.config.authentication) {
            const auth = this.config.authentication;

            const hasDevices = auth.devices && Object.keys(auth.devices).length > 0;
            const hasApiKey = auth.apiKey && auth.apiKey.length > 0;

            if(!hasDevices) {
                console.error("Devices mapping is not available in configuration");
            }

            if(!hasApiKey) {
                console.error("API Key is not available in configuration");
            }

            this.enabled = hasDevices && hasApiKey;

        } else {
            console.error("Invalid configuration");
        }
    }

    getEndpoint(route) {
        const endpoint = `${route}${CONSTS.API_KEY_PARAM}`;

        return endpoint;
    }

    userCheck(req, res, next){
        let httpCode = 401;
        let error = null;
        let errorLogMessage = null;

        const email = req.query.eml;

        if(email === undefined || email === null || email.length === 0) {
            error = `Invalid request data`;
            errorLogMessage = `${error}`;
            httpCode = 400;
        } else {
            const username = this.devices[email];

            if(!username) {
                error = `Failed to authenticate request to ${req.path}, Invalid EMail`;
                errorLogMessage = `${error} '${email}'`;
            }
        }        

        if(error === null) {
            
            return next();
        } else {
            console.error(errorLogMessage);
            res.status(httpCode).send({ error });
        }
    }

    apiKeyCheck(req, res, next) {
        const apiKey = req.query.apiKey;

        if(this.apiKey !== apiKey) {
            const error = `Failed to authenticate request to ${req.path}, Invalid API Key`;

            console.error(`${error} '${apiKey}'`);
            res.status(401).send({ error });

            return;
        }

        return next();
    };
};

module.exports.APIMiddleware = APIMiddleware;

