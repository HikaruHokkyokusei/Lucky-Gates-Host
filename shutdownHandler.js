"use strict";

const events = require("events");
const ShutdownHandler = new events.EventEmitter();

const shutdown = () => {
  const e = {
    preventDefault: function () {
      this._preventDefault = true;
    }
  };

  ShutdownHandler.emit("exit", e);

  if (!e._preventDefault) {
    console.log("Exiting...");
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

if (!process.stdin.isRaw) {
  process.stdin.setRawMode(true);
}

process.stdin.resume();

// process.stdin.on("data", function (input) {
//   for (let i = 0; i < input.length; i++) {
//     if (input[i] === 0x03) return shutdown();
//   }
// });


module.exports = {
  ShutdownHandler
};
