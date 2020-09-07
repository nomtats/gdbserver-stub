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
          handlePacket(socket, packet);
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

function handlePacket(socket, packet) {
  // Add an acknowlegement at the begining of the reply.
  let reply = '+';
  let m;
  if (packet == "?") {
    // Use stop reason SIGTRAP(5).
    reply += generateReply('S05');
  } else if (packet == "g") {
    const registers = handleReadRegisters();
    const value = binaryToHex(registers);
    reply += generateReply(value);
  } else if (m = packet.match(/^G([0-9a-zA-Z]+)/)) {
    let values = hexToBinary(m[1]);
    handleWriteRegisters(values);
    reply += generateReply('OK');
  } else if (m = packet.match(/^m([0-9a-zA-Z]+),([0-9a-zA-Z]+)/)) {
    const address = parseInt(m[1], 16);
    const length = parseInt(m[2], 16);
    const bytes = handleReadMemory(address, length);
    reply += generateReply(bytes.map(byteToHex).join(""));
  } else if (m = packet.match(/^M([0-9a-zA-Z]+),([0-9a-zA-Z]+):([0-9a-zA-Z]+)/)) {
    const address = parseInt(m[1], 16);
    const length = parseInt(m[2], 16);
    const bytes = hexToBinary(m[3]);
    if (length != bytes.length) {
      // The spec doesn't specify what should happen when the length parameter doesn't
      // match the incoming data. We just reply with error 1 here.
      reply += generateReply('E01');
    } else {
      handleWriteMemory(address, bytes);
      reply += generateReply('OK');
    }
  } else if (m = packet.match(/^s([0-9a-zA-Z]+)?/)) {
    let address;
    if (m[1] !== undefined) {
      address = parseInt(m[1], 16);
    }
    handleStep(address);
    reply += generateReply('S05');
  } else if (m = packet.match(/^c([0-9a-zA-Z]+)?/)) {
    let address;
    if (m[1] !== undefined) {
      address = parseInt(m[1], 16);
    }
    handleContinue(address);
    reply += generateReply('S05');
  } else {
    reply += generateReply('');
  }
  log(`->:${reply}`);
  socket.write(reply);
}

const registers = {
  gprs: new Array(32).fill(0),
  rs: 0,
  hi: 0,
  lo: 0,
  bad: 0,
  cause: 0,
  // 0xbfc00000 is MIPS's reset vector
  pc: 0xbfc00000,
  fcsr: 0,
  fir: 0,
}

const memory = new Array(1024).fill(0);

// Set the initial content of memory just for fun.
// asm:
//   li t0
//   li t1
//   add t2, t0, t1
handleWriteMemory(0xbfc00000, int32ArrayToBytes([0x200803e8, 0x200907d0, 0x01095020]));

function handleStep(address) {
  log("step");
  if (address) {
    registers.pc = address
  }
  registers.pc += 4;
}

function handleContinue(address) {
  log("continue");
  if (address) {
    registers.pc = address
  }
  registers.pc += 4;
}

function handleReadMemory(address, length) {
  log("readMemory");
  const start = Math.max(address - 0xbfc00000, 0);
  const end = Math.max(start + length, memory.length);
  return memory.slice(start, end);
}

function handleWriteMemory(address, values) {
  log("writeMemory");
  const start = Math.max(address - 0xbfc00000, 0);
  const end = Math.max(start + values.length, memory.length);
  for (let i = start; i < end; i++) {
    memory[i] = values[i - start];
  }
}

function handleReadRegisters() {
  log("readRegisters");
  const r = registers;
  const values = [...r.gprs, r.sr, r.hi, r.lo, r.bad, r.cause, r.pc, r.fcsr, r.fir];
  return int32ArrayToBytes(values);
}

function handleWriteRegisters(bytes) {
  log("writeRegisters");
  const values = bytesToInt32Array(bytes);
  // Skip the $zero register.
  for (let i = 1; i < registers.gprs.length; i++) {
    registers.gprs[i] = values[i];
  }
  registers.sr = values[32];
  registers.hi = values[33];
  registers.lo = values[34];
  registers.bad = values[35];
  registers.cause = values[36];
  registers.pc = values[37];
}

function computeChecksum(packet) {
  return packet.split('')
    .map(x => x.charCodeAt(0))
    .reduce((a, b) => (a + b) & 0xff, 0);
}

function generateReply(packet) {
  const checksum = computeChecksum(packet).toString(16).padStart(2, "0");
  return `\$${packet}#${checksum}`;
}

function hexToBinary(hex) {
  let ret = [];
  for (let i = 0; i < hex.length; i += 2) {
    let value = parseInt(hex.substr(i, 2), 16);
    ret.push(value);
  }
  return ret;
}

function binaryToHex(bytes) {
  return bytes.map(byteToHex).join("");
}

function byteToHex(value) {
  return (value & 0xff).toString(16).padStart(2, "0");
}

function int32ToBytes(value) {
  return [
    (value >> 0)  & 0xff,
    (value >> 8)  & 0xff,
    (value >> 16)  & 0xff,
    (value >> 24) & 0xff,
  ];
}

function int32ArrayToBytes(values) {
  const bytes = [];
  for (let i = 0; i < values.length; i++) {
    int32ToBytes(values[i]).forEach(x => bytes.push(x));
  }
  return bytes;
}

function bytesToInt32(bytes) {
  return ((bytes[0] << 0)  & 0x000000ff) |
    ((bytes[1] << 8)  & 0x0000ff00) |
    ((bytes[2] << 16) & 0x00ff0000) |
    ((bytes[3] << 24) & 0xff000000);
}

function bytesToInt32Array(bytes) {
  const values = [];
  for (let i = 0; i < bytes.length; i += 4) {
    values.push(bytesToInt32(bytes.slice(i, i + 4)));
  }
  return values;
}