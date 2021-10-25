const fs = require('fs');
const {ClientBase} = require("./client.js");

const CONFIG_FILE_MEMORY = "/config/memory.json";

class MemoryClient extends ClientBase {
    constructor() {
        super();

        this.client = null;
        this.config = null;
        this.intervalId = null;

        this.dataItems = [];
        this.rawItems = [];
      };

    Initialize() {
        console.info("Initializing MemoryClient");

        if (fs.existsSync(CONFIG_FILE_MEMORY)) {
            this.config = require(CONFIG_FILE_MEMORY);

            this.enabled = true;
            this.isConnected = true;  
            
            if(fs.existsSync(this.config.outputDirectory)) {
                this.intervalId = setInterval(this.flush, this.config.flushInterval * 1000, this);
            } else {
                console.error(`Directory ${this.config.outputDirectory} not exist`);
            }
        }
    };

    SendRaw(message) {
        if(this.isConnected && this.enabled) {
            this.rawItems.push({
                timestamp: new Date().toISOString(),
                data: message
            });

            if(this.rawItems.length > this.config.maximumInMemory) {
                this.rawItems = this.rawItems.slice(this.config.maximumInMemory * -1);
            }
        }
    };

    SendData(message) {
        if(this.isConnected && this.enabled) {
            this.dataItems.push({
                timestamp: new Date().toISOString(),
                data: message
            });

            if(this.dataItems.length > this.config.maximumInMemory) {
                this.dataItems = this.dataItems.slice(this.config.maximumInMemory * -1);
            }
        }
    };

    flush(self) {
        const files = {
            "raw": self.rawItems,
            "data": self.dataItems
        };

        const outputDirectory = self.config.outputDirectory;

        Object.keys(files).forEach(k => {
            fs.writeFile (`${outputDirectory}/${k}.json`, JSON.stringify(files[k]), function(err) {
                if(err)  {
                    console.error(`Failed to store ${k}`);
                }
             });
        });        
    }
};

module.exports.MemoryClient = MemoryClient;