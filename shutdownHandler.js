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

if (process.stdin.isTTY && !process.stdin.isRaw) {
  process.stdin.setRawMode(true);
}

process.stdin.resume();

module.exports = {
  ShutdownHandler
};
