# Torque API to MQTT
Listens to events from Torque App and publishes to vairous output plugins

[GitHub](https://github.com/elad-bar/torque-api) | [Docker Hub](https://hub.docker.com/repository/docker/eladbar/torque-api)

## How to use

### Run docker container using the following Docker Compose
```yaml
  torque-api:
    image: eladbar/torque-api:latest
    restart: unless-stopped
    hostname: torque-api
    container_name: torque-api
    ports:
      - 8128:8128
    volumes:
      - ./config/config.json:/usr/src/app/config.json
      - ./data:/data
      - /etc/localtime:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro

```

### Setup Tourqe App

In *Settings -> Data Logging & Upload*

Under the *Logging Preferences* header:

Touch *Select what to log*, activate the menu in the upper right, and select *Add PID to log*.
Select items of interest.

Under the *Realtime Web Upload* header:

Check *Upload to web-server*.
- Enter http://HOST:PORT/api/torque as the *Web-server URL*, where HOST and PORT are your externally accessible Torque API HTTP host and port. 
- Enter an email address in User Email Address (Same email address as in the `devices.yaml`)
- Note that it is recommanded to use HTTP with Torque App

### Configuration

Configuration file should be available at `/usr/src/app/config.json`, example:

```json
{
    "authentication": {
        "apiKey": "APIKEY",
        "devices": {
            "email@email.com": "Name of the Car"
        }
    },
    "output": {
        "influxdb": {
            "host": "127.0.0.1",
            "port": 8086,
            "protocol": "http",
            "bucket": "torque",
            "organization": "org",
            "token": "token",
            "measurement": "device"
        },
        "mqtt": {
            "host": "192.168.2.6",
            "port": 1883,
            "username": "mqtt",
            "password": "Windows",
            "clientId": "TorqueAPIDEV",
            "topic": "torque/device-dev/status"
        },
        "memory": {
            "maximumInMemory": 10000,
            "flushInterval": 60,
            "outputDirectory": "/data"
        }
    }
}
```

#### Authentication Section
Represent configurations related to access the API, avoid configuring them will fail the load of the API

##### API Key

```json
{
    "authentication": {
        "apiKey": "APIKEY"
    }
}
```

##### Devices
Key-value pairs of email as configured in the TorqueApp and the desired device name in the output plugins

```json
{
    "authentication": {
        "devices": {
            "email@email.com": "Name of the Car"
        }
    }
}
```

#### Output Section
Represents the output plugins configuration, avoid configuring a specific output plugin will disable it

##### InfluxDB

Key | Type | Description | 
---|---|---|
host | string | hostname or IP of the InfluxDB server |
port | integer | port of the InfluxDB server
protocol | string | protocol to connect the InfluxDB server - http or https
bucket | string | name of the bucket
organization | string | name of the organization
token | string | access token with write permission to the relevant bucket
measurement | string | name of the measurement

##### MQTT

Key | Type | Description | 
---|---|---|
host | string | hostname or IP of the MQTT Broker |
port | integer | port of the MQTT Broker
username | string | username
password | string | password
clientId | string | Client ID
topic | string | topic as will be published once event was sent

##### Memory

Key | Type | Description | 
---|---|---|
maximumInMemory | integer | Number of objects in memory
flushInterval | integer | Interval in second to flush to disk
outputDirectory | string | path to store the raw data and data

## Endpoints

Endpint | Method | Description | API Key | Depends on output configuration
---|---|---|---|---|
/ | GET | Readme | - | - |
/api/torque | GET | Report statistics (For Torque App) |  - | - |
/api/torque/raw | GET | Raw event's data | + | memory |
/api/torque/data | GET | Processed events | + | memory |
/api/torque/sensors | GET | List all available sensors |  + | - |
/api/debug | GET | Get debug mode | + | - |
/api/debug | POST | Set debug mode | + | - |
/api/debug | DELETE | Stop debug mode | + | - |