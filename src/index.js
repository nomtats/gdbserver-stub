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
          // Add an acknowlegement at the begining of the reply.
          let reply = '+';
          if (packet == "?") {
            // Use stop reason SIGTRAP(5).
            reply += generateReply('S05');
          } else if (packet == "g") {
            const registers = readRegisters();
            const value = registers.map(toLittleEndianHex).join("");
            reply += generateReply(value);
          } else {
            reply += generateReply('');
          }
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
    .reduce((a, b) => (a + b) & 0xff, 0);
}

function generateReply(packet) {
  const checksum = computeChecksum(packet).toString(16).padStart(2, "0");
  return `\$${packet}#${checksum}`;
}

function readRegisters() {
  let gprs = []
  for (let i = 0; i < 32; i++) {
    gprs.push(i);
  }
  let sr = 0;
  let hi = 0;
  let lo = 0;
  let bad = 0xffffffff;
  let cause = 0;
  // Initial vector
  let pc = 0xbfc00000;
  let fcsr = 0;
  let fir = 0;
  return gprs.concat([sr, hi, lo, bad, cause, pc, fcsr, fir]);
}

function toLittleEndianHex(value) {
  let ret = [];
  for (let i = 0; i < 4; i++) {
    const hex = value >> (i * 8) & 0xff;
    ret.push(hex.toString(16).padStart(2, "0"));
  }
  return ret.join("");
}
