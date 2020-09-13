/**
 * Copyright (c) Tatsuo Nomura <tatsuo.nomura@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as net from "net";

const log = console.log;

export class GDBServerStub {
  constructor(handler) {
    this.handler = handler;
    this.server = undefined;
  }

  start(host, port) {
    if (this.server !== undefined) {
      log('Already started.');
      return;
    }

    this.server = net.createServer(socket => {
      log(`Connection accepted: ${socket.remoteAddress}:${socket.remotePort}`)
      socket.on("data", (data) => this.onData(socket, data));
      socket.on("close", () => log("Connection closed"));
    });
    this.server.on("error", err => { throw err; });
    this.server.on("close", () => {
      log("Echo Server, Shutdown");
      this.server = undefined;
    });
    this.server.listen({ host: host, port: port }, () => {
      log(`Started a server at ${port}`)
    });
  }

  onData(socket, data) {
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
        const expected = this.computeChecksum(packet);
        if (checksum == expected) {
          this.handlePacket(socket, packet);
        } else {
          log(`Invalid checksum. Expected ${expected.toString(16)} but received ${m[2]} for packet ${packet}`);
        }
      } else {
        log(`<-:${input}`);
        log(`Unkown incoming message: ${input}`);
        // Ignore the rest of the data.
        break;
      }
      input = input.substr(m[0].length);
    }
  }

  handlePacket(socket, packet) {
    // Reply with an acknowledgement first.
    log(`->:+`);
    socket.write('+');

    let reply;
    let m;
    if (packet == "?") {
      reply = this.handler.handleHaltReason();
    } else if (packet == "g") {
      reply = this.handler.handleReadRegisters();
    } else if (m = packet.match(/^G([0-9a-zA-Z]+)/)) {
      let values = _hexToBinary(m[1]);
      reply = this.handler.handleWriteRegisters(values);
    } else if (m = packet.match(/^m([0-9a-zA-Z]+),([0-9a-zA-Z]+)/)) {
      const address = parseInt(m[1], 16);
      const length = parseInt(m[2], 16);
      reply = this.handler.handleReadMemory(address, length);
    } else if (m = packet.match(/^M([0-9a-zA-Z]+),([0-9a-zA-Z]+):([0-9a-zA-Z]+)/)) {
      const address = parseInt(m[1], 16);
      const length = parseInt(m[2], 16);
      const bytes = _hexToBinary(m[3]);
      if (length != bytes.length) {
        // The spec doesn't specify what should happen when the length parameter doesn't
        // match the incoming data. We just reply with error 1 here.
        reply = error(0);
        console.log('error:' + error + ' ' + error(0));
        console.log('reply:' + reply);
      } else {
        reply = this.handler.handleWriteMemory(address, bytes);
      }
    } else if (m = packet.match(/^s([0-9a-zA-Z]+)?/)) {
      let address;
      if (m[1] !== undefined) {
        address = parseInt(m[1], 16);
      }
      reply = this.handler.handleStep(address);
    } else if (m = packet.match(/^c([0-9a-zA-Z]+)?/)) {
      let address;
      if (m[1] !== undefined) {
        address = parseInt(m[1], 16);
      }
      reply = this.handler.handleContinue(address);
    } else {
      reply = unsupported();
    }
    if (reply === undefined) {
      reply = '';
    }
    const message = this.packageReply(reply);
    log(`->:${message}`);
    socket.write(message);
  }

  computeChecksum(packet) {
    return packet.split('')
      .map(x => x.charCodeAt(0))
      .reduce((a, b) => (a + b) & 0xff, 0);
  }

  packageReply(packet) {
    const checksum = this.computeChecksum(packet).toString(16).padStart(2, "0");
    return `\$${packet}#${checksum}`;
  }
}

export const ERROR_BAD_ACCESS_SIZE_FOR_ADDRESS = 0x34;

/**
 * Generates a valid reply.
 * @param {number|string|object|undefined} value The content of the reply.
 *     - Number means the 
 */
export function ok(value) {
  if (value === undefined) {
    return 'OK';
  } else if (typeof(value) == 'string') {
    return value;
  } else if (Array.isArray(value)) {
    return _binaryToHex(value);
  } else {
    throw `Unkown value type:${value}`;
  }
}

 /**
  * Generates a reply with a stop reason. 
  * @param {number} reason The stop reason.
  */
 export function stopped(reason) {
   return `S${_byteToHex(reason)}`;
 }

 /**
  * Generates an Error reply with an Error No.
  * @param {number} number The error number.
  */
 export function error(number) {
   return `E${_byteToHex(number)}`;
 }

 /**
  * Generates an unsupported reply.
  */
 export function unsupported() {
   return '';
 }


function _binaryToHex(bytes) {
  return bytes.map(_byteToHex).join("");
}

function _byteToHex(value) {
  if (!Number.isInteger(value) || value < 0 || 0xff < value) {
    throw `Value out of range: ${value}`;
  }
  return value.toString(16).padStart(2, "0");
}

function _hexToBinary(hex) {
  let ret = [];
  for (let i = 0; i < hex.length; i += 2) {
    let value = parseInt(hex.substr(i, 2), 16);
    ret.push(value);
  }
  return ret;
}
