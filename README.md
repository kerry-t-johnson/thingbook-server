# regis-msse692-server

## Development

1. Run the server (NodeJS)

```bash
$ npm run dev
```

2. Add test data

```bash
./scripts/thing-book.py                                     \
    --destination http://localhost:3000                     \
    --verbose                                               \
    yaml                                                    \
    ./test/data/thingbook.yml
```

## Mock Organizations

```bash
# Run within the context of sensor-things project:
$ ./sensor-things.py    --verbose                               \
                        --destination http://localhost:18080    \
                        yaml                                    \
                        ./dev/common-data.yml                   \
                        ./dev/mesaverde-data.yml

$ ./sensor-things.py    --verbose                               \
                        --destination http://localhost:28080    \
                        yaml                                    \
                        ./dev/common-data.yml                   \
                        ./dev/shenandoah-data.yml
```

## Unit Testing

```bash
# As expected:
$ npm run test

# To test the sensor-things client, have a sensor-things API server running, then:
$ SENSOR_THINGS_TEST=true npm test -- --grep SensorThings
```

## Settings

Check `.test.env`, `.development.env`, `.production.env`
- Change loggins level
- MongoDB in-memovy settings
