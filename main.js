const Axios = require('axios');
const Hue = require("node-hue-api");

const config = require('./config.json');

if (!config) {
  console.error("Expecting config file");
  return;
}

const { routerURI, watchDevice, username, request } = config;

let previousCurl = {};
let api = null;
let bridges = [];

const Status = {
  ON: true,
  OFF: false
}

const getBridges = () => {
  Hue.upnpSearch().then((res) => {
    bridges = res;
    main();
  }).done();
}

const light = (status) => {
  if (api == null)
    return;
  api.setLightState(4, {"on": status})
  .then(() => {
  })
  .fail((err) => {
    console.error(err);
  })
  .done();
}

const doCurl = () => {
    Axios.post(routerURI, request)
    .then((response) => {
      const data = response.data.result.status;
      // watch on wifi

      const connectedWIFI = data.wifi;
      if (!connectedWIFI)
        return {};

      const wasHere = previousCurl.hasOwnProperty(watchDevice);
      let devicePresent = false;
      previousCurl = {};
      for (var i = 0; i < connectedWIFI.length; ++i) {
        if (connectedWIFI[i].Key === watchDevice) {
          devicePresent = true;
          previousCurl[watchDevice] = true;
          break;
        }
      }

      if (wasHere && !devicePresent) {
          // Left, do not do anything
          light(Status.OFF);
      } else if (!wasHere && devicePresent) {
          // Device connected
          light(Status.ON);
      } else {
        // Nothing changed
      }
    })
    .catch((error) => {
      console.error(error);
    })
    ;
}

const regularCurl = (timeout) => {
  setTimeout(() => {
    doCurl();
    regularCurl(10000);
  }, timeout);
}

const main = () => {
  if (bridges.length) {
    api = new Hue.HueApi(bridges[0].ipaddress, username);
  }

  regularCurl(0);
};


getBridges();
