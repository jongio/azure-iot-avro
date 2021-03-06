/*
MIT License

Copyright (c) 2017 Jon Gallant, Justine Cocchi, James Trott, and Bryan Hughes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

require('dotenv').config();

const common = require('common');

const SCHEMA_ID = 'schema1:1.0.0';

const Protocol = require('azure-iot-device-amqp').Amqp;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;

const client = Client.fromConnectionString(process.env.IOT_HUB_DEVICE_CONNECTION_STRING, Protocol);

const SCHEMA_SERVER_ADDRESS = 'localhost';
const SCHEMA_SERVER_PORT = 3000;

// Create a connection to IoT Hub and then connectCallback.
console.log('Initializing schemas from server');
common.schema.init(SCHEMA_SERVER_ADDRESS, SCHEMA_SERVER_PORT, (err) => {
  if (err) {
    console.error(`Could not fetch the schemas from the server: ${err}`);
    return;
  }
  const type = common.schema.getType(SCHEMA_ID);
  console.log('Connecting to IoT Hub');
  client.open((err) => {
    if (err) {
      console.error(`Could not connect to IoT Hub: ${err}`);
      return;
    }
    console.log('Connected to IoT Hub');

    // Send events to IoT Hub on a timer.
    const sendInterval = setInterval(() => {

      // Generate the faux json
      const tmp = 10 + (Math.random() * 4); // range: [10, 14]
      const json = {
        tmp: 98.6,
        hum: 14.4
      };

      common.avro.compress(type, json, (err, payload) => {
        if (err) {
          console.error(err);
          return;
        }
        const message = new Message(payload.toString('base64'));
        message.properties.add('avro-schema', SCHEMA_ID);
        console.log('Sending message: ' + message.getData());
        client.sendEvent(message, (err, res) => {
          if (err) {
            console.error(`Send error: ${err}`);
            return;
          }
          console.log(`Send status: ${res.constructor.name}`);
        });
      });
    }, 2000);

    client.on('error', function (err) {
      console.error(err);
    });

    client.on('disconnect', function () {
      clearInterval(sendInterval);
      client.removeAllListeners();
    });
  });
});
