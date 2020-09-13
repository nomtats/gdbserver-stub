/**
 * Copyright (c) Tatsuo Nomura <tatsuo.nomura@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

jest.mock('net');
jest.mock('../gdb-command-handler.js');

import { Socket } from 'net';
import { ok, error, unsupported, stopped, GDBServerStub } from '../gdb-server-stub.js';
import { GDBCommandHandler } from '../gdb-command-handler.js';

beforeEach(() => {
  GDBCommandHandler.mockClear();
  Socket.mockClear();
});

test('unsupported', () => {
  expect(unsupported()).toEqual('');
});

test('ok', () => {
  expect(ok()).toEqual('OK');
  expect(ok('text')).toEqual('text');
  expect(ok([0x1a, 0x2b, 0x3c, 0x4d])).toEqual('1a2b3c4d');
});

test('ok value out of range', () => {
  expect(() => ok([0x100])).toThrow();
  expect(() => ok([1.1])).toThrow();
  expect(() => ok([-1])).toThrow();
});

test('ok unkown type', () => {
  expect(() => ok(['test'])).toThrow();
  expect(() => ok({})).toThrow();
});

test('stopped', () => {
  expect(stopped(0)).toEqual('S00');
  expect(stopped(5)).toEqual('S05');

  expect(() => stopped(-1)).toThrow();
  expect(() => stopped(0x100)).toThrow();
  expect(() => stopped()).toThrow();
  expect(() => stopped({})).toThrow();
  expect(() => stopped([])).toThrow();
});

test('error', () => {
  expect(error(0)).toEqual('E00');
  expect(error(0xa0)).toEqual('Ea0');
  
  expect(() => error()).toThrow();
  expect(() => error(0x100)).toThrow();
});

test('unsupported command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  stub.handlePacket(socket, 'UNKOWN');
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$#00');
});

test('? command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleHaltReason.mockReturnValue("S05");
  stub.handlePacket(socket, '?');
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$S05#b8');
});

test('g command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleReadRegisters.mockReturnValue("1234abcd");
  stub.handlePacket(socket, 'g');
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$1234abcd#54');
});

test('G command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleWriteRegisters.mockReturnValue("OK");
  stub.handlePacket(socket, 'G1234abcd');
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});

test('m command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleReadMemory.mockReturnValue("OK");
  stub.handlePacket(socket, 'm1234abCD,3000');
  expect(handler.handleReadMemory).toHaveBeenCalledWith(0x1234abcd, 0x3000);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});

test('M command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleWriteMemory.mockReturnValue("OK");
  stub.handlePacket(socket, 'M1234abCD,a:0102030405a0b0C0d0E0');
  expect(handler.handleWriteMemory).toHaveBeenCalledWith(0x1234abcd, [1,2,3,4,5,0xa0,0xb0,0xc0,0xd0,0xe0]);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});


test('M command wrong length', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  stub.handlePacket(socket, 'M1234abCD,1:0102');
  expect(handler.handleWriteMemory).toHaveBeenCalledTimes(0);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$E00#a5');
});

test('s command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleStep.mockReturnValue("S05");
  stub.handlePacket(socket, 's');
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$S05#b8');
});

test('s command with address', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleStep.mockReturnValue("S05");
  stub.handlePacket(socket, 'sabcd1234');
  expect(handler.handleStep).toHaveBeenCalledWith(0xabcd1234);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$S05#b8');
});

test('c command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleContinue.mockReturnValue("S05");
  stub.handlePacket(socket, 'c');
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$S05#b8');
});

test('c command with address', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleContinue.mockReturnValue("S05");
  stub.handlePacket(socket, 'cabcd1234');
  expect(handler.handleContinue).toHaveBeenCalledWith(0xabcd1234);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$S05#b8');
});