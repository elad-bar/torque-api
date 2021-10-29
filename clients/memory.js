const fs = require('fs');
const {ClientBase} = require("./client.js");

class MemoryClient extends ClientBase {
    constructor() {
        super();

        this.client = null;
        this.name = "memory";
        this.intervalId = null;

        this.data = {
            "raw": [],
            "data": []
        };
    };

    get rawDataItems(){
        return this.data["raw"];
    };

    get dataItems(){
        return this.data["data"];
    };

    Connect() {
        if (this.enabled) {
            this.isConnected = true;  
            
            if(fs.existsSync(this.config.outputDirectory)) {
                this.load();

                this.intervalId = setInterval(this.flush.bind(this), this.config.flushInterval * 1000, this);
            } else {
                console.error(`Directory ${this.config.outputDirectory} not exist`);
            }
        }
    };

    send(key, message) {
        if(this.isConnected && this.enabled) {
            const data = this.data[key];
            data.push({
                timestamp: new Date().toISOString(),
                data: message
            });

            if(data.length > this.config.maximumInMemory) {
                data = data.slice(this.config.maximumInMemory * -1);
            }

            this.data[key] = data;
        }
    }

    SendRaw(message) {
        this.send("raw", message);
    };

    SendData(message) {
        this.send("data", message);
    };

    flush() {
        const outputDirectory = this.config.outputDirectory;

        Object.keys(this.data).forEach(k => {
            const items = this.data[k];

            fs.writeFile (`${outputDirectory}/${k}.json`, JSON.stringify(items), function(err) {
                if(err)  {
                    console.error(`Failed to store ${k}`);
                }
             });
        });        
    }

    load() {
        const outputDirectory = this.config.outputDirectory;

        Object.keys(this.data).forEach(k => {
            fs.readFile (`${outputDirectory}/${k}.json`, (err, data) => {
                if(err)  {
                    console.error(`Failed to load ${k}`);
                }

                const items = JSON.parse(data);
                this.data[k] = items;

                console.info(`Loaded ${Object.keys(items).length} ${k} items`);
            });
        });
    }
};

module.exports.MemoryClient = MemoryClient;