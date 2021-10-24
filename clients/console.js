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

    Send(message) {
        if(this.isConnected && this.enabled) {
            console.info(message);
        }
    };
};

module.exports.ConsoleClient = ConsoleClient;