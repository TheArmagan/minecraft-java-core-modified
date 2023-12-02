const { Launch } = require("./build/Index.js");
const path = require("path");

const launched = new Launch();

let ogEmit = launched.emit;

launched.emit = function (...args) {
  console.log(...args);
  return ogEmit.call(this, ...args);
};

launched.Launch({
  authenticator: {
    access_token: "00000000-0000-0000-0000-000000000000",
    client_token: "00000000-0000-0000-0000-000000000000",
    uuid: "00000000-0000-0000-0000-000000000000",
    name: "TheArmagan",
    user_properties: '{}',
    meta: {
      online: false,
      type: 'Mojang'
    },
  },
  downloadFileMultiple: 2,
  detached: false,
  path: path.join(__dirname, ".minecraft"),
  version: "1.20.1",
  instance: "test-instance/.minecraft",
  verify: false,
  args: [],
  java: true,
  loader: {
    enable: false
  }
}).then(proc => {
  console.log(proc.spawnargs);
});

