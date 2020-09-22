/**
 * Copyright (c) Tatsuo Nomura <tatsuo.nomura@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

 import { unsupported } from './gdb-server-stub.js';
 import { EventEmitter } from 'events';

/**
 * A handler handles the incoming GDB commands via GDBServerStub.
 * This class replies to all messages as "unsupported".
 * One must extend this class and implement the handling functions to use it.
 */
export class GDBCommandHandler extends EventEmitter {

  /**
   * Handles ? command that queries the reason of the half.
   * @returns the reason of the halt. e.g. "S05" for SIG_TRAP
   */
  handleHaltReason() { return unsupported(); }

  /**
   * Handles step execution. It executes one instruction and stops.
   * @param {number|undefined} address The address at which the handler executes.
   *    If undefined, the current address should be used.
   */
  handleStep(address) { return unsupported(); }

  /**
   * Handles continue execution. It executes until the next break point.
   * @param {number|undefined} address The address at which the handler executes.
   *    If undefined, the current address should be used.
   */
  handleContinue(address) { return unsupported(); }

  /**
   * Handles read of the memory content.
   * @param {number} address The address to start reading.
   * @param {number} length The number of units (usually bytes) to be read.
   */
  handleReadMemory(address, length) { return unsupported(); }

  /**
   * Handles write to the memory.
   * @param {number} address The address to start writing.
   * @param {number[]} values The values to be written.
   */
  handleWriteMemory(address, values) { return unsupported(); }

  /**
   * Handles read of all register values.
   * @param {number|undefined} threadId The target thread's ID.
   */
  handleReadRegisters() { return unsupported(); }

  /**
   * Handles write to all register values.
   */
  handleWriteRegisters(bytes) { return unsupported(); }

  /**
   * Handles read the value of the register at the index.
   * @param {number|undefined} index The index of the target register.
   */
  handleReadRegister(index) { return unsupported(); }

  /**
   * Handles querying of supported features.
   * @param {object[]} features The features that GDB supports.
   */
  handleQSupported(features) { return unsupported(); }

  /**
   * Handles starting NoAckMode.
   */
  handleStartNoAckMode() { return unsupported(); }

  /**
   * Handles querying of thread info. Returns a list of Thread IDs.
   */
  handleThreadInfo() { return unsupported(); }

  /**
   * Handles querying of the current Thread ID.
   */
  handleCurrentThread() { return unsupported(); }

  /**
   * Handles querying of information of the register at the index.
   * @param {number} index The register's index
   */
  handleRegisterInfo(index) { return unsupported(); }

  /**
   * Handles querying of the GDB host information.
   * e.g.: 'triple:6d697073656c2d756e6b6e6f776e2d6c696e75782d676e75;endian:little;ptrsize:4'
   */
  handleHostInfo() { return unsupported(); }

  /**
   * Selects the thread for step and continue execution.
   * @param {number} threadId The selected Thread ID
   */
  handleSelectExecutionThread(threadId) { return unsupported(); }

  /**
   * Selects the thread for read/write registers.
   * @param {number} threadId The selected Thread ID
   */
  handleSelectRegisterThread(threadId) { return unsupported(); }

  /**
   * Selects the thread for read/write memory.
   * @param {number} threadId The selected Thread ID
   */
  handleSelectMemoryThread(threadId) { return unsupported(); }

  /**
   * Handles addding a breakpoint.
   * @param {number} type The type of the breakpoint.
   *                      0: software
   *                      1: hardware
   *                      2: write watchpoint
   *                      3: read watchpoint
   *                      4: access watchpoint
   * @param {number} address The address of the breakpoint
   * @param {number} kind Target specific. Usually the breakpoint size in bytes
   */
  handleAddBreakpoint(type, address, kind) { return unsupported(); }

  /**
   * Handles removing a breakpoint.
   * @param {number} type The type of the breakpoint.
   *                      0: software
   *                      1: hardware
   *                      2: write watchpoint
   *                      3: read watchpoint
   *                      4: access watchpoint
   * @param {number} address The address of the breakpoint
   * @param {number} kind Target specific. Usually the breakpoint size in bytes
   */
  handleRemoveBreakpoint(type, address, kind) { return unsupported(); }
}
