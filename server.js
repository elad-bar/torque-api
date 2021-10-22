
require('dotenv').config();

const http = require('http');
const https = require('https');
const url = require('url');

const haHost = process.env.HA_HOST;
const haPort = process.env.HA_PORT;
const haToken = process.env.HA_TOKEN;

const apiPort = 8128;
const apiKey = process.env.API_KEY;

SUPPORTED_ENDPOINTS = [
    "/api/torque",
    "/favicon.ico"
];

let app = http.createServer((request, response) => {
    const requestData = url.parse(request.url, true);
    const address = requestData.pathname;	
	const queryParams = requestData.query;
	const requestApiKey = queryParams.apiKey;
    const queryString = JSON.stringify(queryParams);
    
    let message = `Completed, Query: ${queryString}`;
    let responseCode = 200;

    try {
        if(requestApiKey !== apiKey) {
            message = `Unauthorized API Key: ${requestApiKey}`;
            responseCode = 403;
		}

        if(request.method !== 'GET' && responseCode === 200) {
            message = `${request.method} method is not supported`;
            responseCode = 405;
		}

        if(!SUPPORTED_ENDPOINTS.includes(address) && responseCode === 200) {
            message = `${address} endpoint is not supported`;
            responseCode = 400;
		}
        
        if(responseCode == 200) {
            const forwardRequest = {
                hostname: haHost,
                port: haPort,
                method: request.method,
                path: request.url,
                headers: {
                    'Authorization': `Bearer ${haToken}`
                }
            };

            let process = https.request(forwardRequest, (forwardResponse) => {
                responseCode = forwardResponse.statusCode;

                forwardResponse.on('data', (data) => {
                    message = `Forwarding request, Data: ${JSON.stringify(data)}, Query: ${queryString}`;
                    response.write(data);
                });

                forwardResponse.on('end', () => {
                    message = `Forwarding request completed, Query: ${queryString}`;
                    response.end();
                });
            });

            process.on('error', (error) => {
                responseCode = forwardResponse.statusCode;
                message = `Error ${JSON.stringify(error)}`;
            });

            process.end();
        }         
    }
    catch (exception) {
        message = `Exception ${JSON.stringify(exception)}`;
        responseCode = 400;
    }

    if (responseCode == 200) {
        console.info(message);

    } else {
        console.warn(message);

        response.writeHead(responseCode);
        response.end(message);
    } 
});

if (apiKey === null || apiKey.length === 0) {
    console.info(`Cannot server on port ${apiPort}, API Key was not set`);

} else {
    console.info(`Starting server on port ${apiPort}`);
    // Start the server on port 8128
    app.listen(apiPort, '0.0.0.0');
}