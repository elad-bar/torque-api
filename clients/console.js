const {ClientBase} = require("./client.js");

class ConsoleClient extends ClientBase {
    constructor() {
        super();

        this.client = null;
        this.config = null
      };

    Initialize() {
        console.info("Initializing ConsoleClient");

        this.enabled = false; 
        this.isConnected = true;   
    };

    SendRaw(message) {
        if(this.isConnected && this.enabled) {
            console.info(`Raw: ${JSON.stringify(message)}`);
        }
    };

    SendData(message) {
        if(this.isConnected && this.enabled) {
            console.info(`Data: ${JSON.stringify(message)}`);
        }
    };
};

module.exports.ConsoleClient = ConsoleClient;