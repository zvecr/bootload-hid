/* eslint-disable no-param-reassign */
/* eslint-disable no-bitwise */
/* eslint-disable class-methods-use-this */
const fs = require('fs').promises;
const EventEmitter = require('events');
const whilst = require('async/whilst');
const HID = require('node-hid');
const intelhex = require('intel-hex');

function isBootloadHID(device) {
  return (device.vendorId === 0x16c0 && device.productId === 1503);
}

class BootloadHID extends EventEmitter {
  constructor(opts) {
    super();

    opts = opts || {};
    this.manualReset = !!opts.manualReset;
    this.debug = opts.debug || false;
    this.path = opts.port || null;

    if (this.debug) {
      const debugFunc = (typeof this.debug === 'function') ? this.debug : console.log;

      this.on('connected', (device) => { debugFunc(`connected to bootloader at ${device.path}`); });
      this.on('flash:start', () => { debugFunc('flashing, please wait...'); });
      // this.on("flash:progress", () => { debugFunc('.'); });
      this.on('flash:done', () => { debugFunc('flash complete'); });
    }
  }

  pathFilter(path) {
    // also match the path if we have no filter
    return !this.path || (this.path === path);
  }

  // async loadHex(file) {
  //   return new Promise((resolve, reject) => {
  //     setImmediate(async () => {
  //       try {
  //         const data = await fs.readFile(file);
  //         const isZeroStart = Buffer.from(":100000000").compare(data, 0, 10) == 0;
  //         if (!isZeroStart) {
  //           throw new Error("TODO: not supported")
  //         }

  //         const hex = intelhex.parse(data).data;
  //         resolve({
  //           hex,
  //           startAddr: 0,
  //           endAddr: hex.length,
  //         });
  //       } catch (e) {
  //         reject(e);
  //       }
  //     });
  //   });
  // }

  async loadHex(file) {
    const data = await fs.readFile(file);
    // const isZeroStart = Buffer.from(":100000000").compare(data, 0, 10) == 0;
    // if (!isZeroStart) {
    //   throw new Error("TODO: not supported")
    // }

    const hex = intelhex.parse(data).data;
    return {
      hex,
      startAddr: 0,
      endAddr: hex.length,
    };
  }

  async getBoard() {
    const info = HID.devices().find(dev => isBootloadHID(dev) && this.pathFilter(dev.path));
    if (!info) {
      throw new Error('The specified device was not found');
    }

    const device = new HID.HID(info.path);
    this.emit('connected', device);

    return device;
  }

  getBoardInfo(device) {
    const buf = Buffer.from(device.getFeatureReport(1 << 8, 8));

    return {
      pageSize: buf.readUIntBE(2, 1),
      deviceSize: buf.readUIntBE(5, 2),
    };
  }

  rebootBoard(device) {
    return device.sendFeatureReport([0x01, 0x80, 0x48, 0x00, 0x09, 0x09, 0x0f]);
  }

  async programBoard(device, hex, pageSize, deviceSize, startAddr, endAddr) {
    if (endAddr > deviceSize - 2048) {
      throw new Error(`Data (${endAddr} bytes) exceeds remaining flash size!`);
    }

    let mask = 0;
    if (pageSize < 128) {
      mask = 127;
    } else {
      mask = pageSize - 1;
    }
    startAddr &= ~mask; /* round down */
    endAddr = (endAddr + mask) & ~mask; /* round up */

    this.emit('flash:start', device, startAddr, endAddr, pageSize, deviceSize);

    await whilst(cb => cb(null, (startAddr < endAddr)), async () => {
      // the following fails as it does not pad partially filled buffers with 0xff
      // const slice = hex.slice(startAddr, startAddr + 128);
      const slice = Buffer.alloc(128, 0xff);
      hex.copy(slice, 0, startAddr, startAddr + 128);

      const pre = Buffer.from([0x02, startAddr & 0xff, startAddr >> 8, 0x00]);
      const final = Buffer.concat([pre, slice]);

      this.emit('flash:progress', device, startAddr, startAddr + slice.length);
      device.sendFeatureReport([...final]);

      startAddr += slice.length;
    });

    this.emit('flash:done', device);
  }

  async flash(file, callback = (() => { })) {
    let device;
    try {
      device = await this.getBoard();

      const { hex, startAddr, endAddr } = await this.loadHex(file);
      const { pageSize, deviceSize } = this.getBoardInfo(device);

      await this.programBoard(device, hex, pageSize, deviceSize, startAddr, endAddr);

      if (!this.manualReset) {
        this.rebootBoard(device);
      }

      callback();
    } catch (e) {
      callback(e);
    } finally {
      if (device) {
        device.close();
      }
    }
  }

  static list(callback) {
    try {
      const deviceInfo = HID.devices().filter(isBootloadHID);
      callback(undefined, deviceInfo);
    } catch (e) {
      callback(e);
    }
  }
}

module.exports = BootloadHID;
