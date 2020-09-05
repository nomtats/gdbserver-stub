/**
 * Copyright (c) Tatsuo Nomura <tatsuo.nomura@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict'

import { createServer } from "net";

const log = console.log;
const error = console.error;

const server = createServer(socket => {
  log(`Connection accepted: ${socket.remoteAddress}:${socket.remotePort}`)
  socket.on("data", (data) => {
    let input = data.toString();
    while (input.length > 0) {
      let m;
      if (m = input.match(/^\+/)) {
        // ack
        log(`<-:${m[0]}`);
      } else if (m = input.match(/^\$([^#]*)#([0-9a-zA-Z]{2})/)) {
        log(`<-:${m[0]}`);
        const packet = m[1];
        const checksum = parseInt(m[2], 16);
        const expected = computeChecksum(packet);
        if (checksum == expected) {
          const reply = '+$#00';
          log(`->:${reply}`);
          socket.write(reply);
        } else {
          error(`Invalid checksum. Expected ${expected.toString(16)} but received ${m[2]} for packet ${packet}`);
        }
      } else {
        log(`<-:${input}`);
        error(`Unkown incoming message: ${input}`);
        // Ignore the rest of the data.
        break;
      }
      input = input.substr(m[0].length);
    }
  });
  socket.on("close", () => log("Connection closed"));
});
server.on("error", err => { throw err; });
server.on("close", () => log("Echo Server, Shutdown"));

const port = 2424;
server.listen({ host: "localhost", port: port }, () => {
  log(`Started a server at ${port}`)
});

function computeChecksum(packet) {
  return packet.split('')
    .map(x => x.charCodeAt(0))
    .reduce((a, b) => (a + b) & 0xff);
}
