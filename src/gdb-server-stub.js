
import * as net from "net";

const log = console.log;
const error = console.error;
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
  }

  handlePacket(socket, packet) {
    // Add an acknowlegement at the begining of the reply.
    let reply = '+';
    let m;
    if (packet == "?") {
      // Use stop reason SIGTRAP(5).
      reply += this.generateReply('S05');
    } else if (packet == "g") {
      const registers = this.handler.handleReadRegisters();
      const value = this.handler.binaryToHex(registers);
      reply += this.generateReply(value);
    } else if (m = packet.match(/^G([0-9a-zA-Z]+)/)) {
      let values = hexToBinary(m[1]);
      this.handler.handleWriteRegisters(values);
      reply += this.generateReply('OK');
    } else if (m = packet.match(/^m([0-9a-zA-Z]+),([0-9a-zA-Z]+)/)) {
      const address = parseInt(m[1], 16);
      const length = parseInt(m[2], 16);
      const bytes = this.handler.handleReadMemory(address, length);
      reply += this.generateReply(bytes.map(byteToHex).join(""));
    } else if (m = packet.match(/^M([0-9a-zA-Z]+),([0-9a-zA-Z]+):([0-9a-zA-Z]+)/)) {
      const address = parseInt(m[1], 16);
      const length = parseInt(m[2], 16);
      const bytes = hexToBinary(m[3]);
      if (length != bytes.length) {
        // The spec doesn't specify what should happen when the length parameter doesn't
        // match the incoming data. We just reply with error 1 here.
        reply += this.generateReply('E01');
      } else {
        this.handler.handleWriteMemory(address, bytes);
        reply += this.generateReply('OK');
      }
    } else if (m = packet.match(/^s([0-9a-zA-Z]+)?/)) {
      let address;
      if (m[1] !== undefined) {
        address = parseInt(m[1], 16);
      }
      this.handler.handleStep(address);
      reply += this.generateReply('S05');
    } else if (m = packet.match(/^c([0-9a-zA-Z]+)?/)) {
      let address;
      if (m[1] !== undefined) {
        address = parseInt(m[1], 16);
      }
      this.handler.handleContinue(address);
      reply += this.generateReply('S05');
    } else {
      reply += this.generateReply('');
    }
    log(`->:${reply}`);
    socket.write(reply);
  }

  computeChecksum(packet) {
    return packet.split('')
      .map(x => x.charCodeAt(0))
      .reduce((a, b) => (a + b) & 0xff, 0);
  }

  generateReply(packet) {
    const checksum = this.computeChecksum(packet).toString(16).padStart(2, "0");
    return `\$${packet}#${checksum}`;
  }

  hexToBinary(hex) {
    let ret = [];
    for (let i = 0; i < hex.length; i += 2) {
      let value = parseInt(hex.substr(i, 2), 16);
      ret.push(value);
    }
    return ret;
  }
}
