const fs = require('fs');
const CONSTS = require("./consts.js");

class APIMiddleware {
    constructor() {
        this.config = null;
        this.enabled = false;
        this.devices = null;
    }

    Initialize() {
        console.info("Initializing ApiKeyMiddleware");
        
        if (fs.existsSync(CONSTS.CONFIG_FILE_DEVICES)) {
            this.devices = require(CONSTS.CONFIG_FILE_DEVICES);

            this.enabled = this.devices !== undefined && this.devices !== null && Object.keys(this.devices).length > 0;
        } else {
            console.error("Devices mapping not found in /config directoy");
        }

        if (fs.existsSync(CONSTS.CONFIG_FILE_API)) {
            this.config = require(CONSTS.CONFIG_FILE_API);

            const hasApiKey = this.config.apiKey !== undefined && this.config.apiKey !== null && this.config.apiKey.length > 0;

            if(!hasApiKey) {
                this.enabled = false;
            }
        } else {
            console.error("API configuration not found in /config directoy");
            this.enabled = false;
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

            if(username === undefined || username === null) {
                error = `Invalid username`;
                errorLogMessage = `${error}, EMail: ${email}`;
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

        if(this.config.apiKey !== apiKey) {
            const error = `Invalid API Key`;

            console.error(`${error}, Key: ${apiKey}`);
            res.status(401).send({ error });

            return;
        }

        return next();
    };
};

module.exports.APIMiddleware = APIMiddleware;

