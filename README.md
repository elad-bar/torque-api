# Torque API to MQTT
Listens to events from Torque App and publishes them via MQTT Message


## How to use

### Prepare configuration files

#### devices.json
Describes the relation between an email configured in Torque App to a device name (as you would like it to be called)
```json
{
    "email@email.com": "Name of car"
}
```

#### mqtt.json
MQTT Broker configuration
```json
{
    "host": "127.0.0.1",
    "port": 1883,
    "username": "user",
    "password": "password",
    "clientId": "TorqueAPI"
}
```

#### Run docker container using the following Docker Compose
```yaml
  torque-api:
    image: eladbar/torque-api:latest
    restart: unless-stopped
    hostname: torque-api
    container_name: torque-api
    ports:
      - 8128:8128
    volumes:
      - ./config:/config
      - /etc/localtime:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro

```
