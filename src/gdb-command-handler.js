/**
 * A handler handles the incoming GDB commands via GDBServerStub.
 * This class replies to all messages as "unsupported".
 * One must extend this class and implement the handling functions to use it.
 */
export class GDBCommandHandler {
  static ERROR_BAD_ACCESS_SIZE_FOR_ADDRESS = 0x34;

  static _binaryToHex(bytes) {
    return bytes.map(this._byteToHex).join("");
  }

  static _byteToHex(value) {
    if (!Number.isInteger(value) || value < 0 || 0xff < value) {
      throw `Value out of range: ${value}`;
    }
    return value.toString(16).padStart(2, "0");
  }

  /**
   * Generates an unsupported reply.
   */
  static unsupported() {
    return '';
  }

  /**
   * Generates a valid reply.
   * @param {number|string|object|undefined} value The content of the reply.
   *     - Number means the 
   */
  static ok(value) {
    if (value === undefined) {
      return 'OK';
    } else if (typeof(value) == 'string') {
      return value;
    } else if (Array.isArray(value)) {
      return this._binaryToHex(value);
    } else {
      throw `Unkown value type:${value}`;
    }
  }

  /**
   * Generates a reply with a stop reason. 
   * @param {number} reason The stop reason.
   */
  static stopped(reason) {
    return `S${this._byteToHex(reason)}`;
  }

  /**
   * Generates an Error reply with an Error No.
   * @param {number} number The error number.
   */
  static error(number) {
    return `E${this._byteToHex(number)}`;
  }

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
   */
  handleReadRegisters() { return unsupported(); }

  /**
   * Handles write to all register values.
   */
  handleWriteRegisters(bytes) { return unsupported(); }
}
