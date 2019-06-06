/* eslint-disable max-len */
/* eslint-env mocha */
const chai = require('chai');
const sinon = require('sinon');
const mockery = require('mockery');
const EventEmitter = require('events');

const DUMMY_HEX = `:100000000C9420030C9464030C947F030C946403FD
:100010000C9464030C9464030C9464030C946403C4
:100020000C9464030C9464030C945A1F0C946403A2
:100030000C9464030C9464030C9464030C946403A4
:100040000C9464030C9464030C9464030C94640394
:100050000C946403620764076F07660768076A0702
:100060006C076E07710773077507800777077907B5
:100070007B077D077F07820783158315B515B515A7
:10008000F5154D174D174D1713164D17AC16AC1629
:100090001C1725174D174617B916B916B916B916F4
:00000001FF`;

const BLOCK_1 = [2, 0, 0, 0, 12, 148, 32, 3, 12, 148, 100, 3, 12, 148, 127, 3, 12, 148, 100, 3, 12, 148, 100, 3, 12, 148, 100, 3, 12, 148, 100, 3, 12, 148, 100, 3, 12, 148, 100, 3, 12, 148, 100, 3, 12, 148, 90, 31, 12, 148, 100, 3, 12, 148, 100, 3, 12, 148, 100, 3, 12, 148, 100, 3, 12, 148, 100, 3, 12, 148, 100, 3, 12, 148, 100, 3, 12, 148, 100, 3, 12, 148, 100, 3, 12, 148, 100, 3, 98, 7, 100, 7, 111, 7, 102, 7, 104, 7, 106, 7, 108, 7, 110, 7, 113, 7, 115, 7, 117, 7, 128, 7, 119, 7, 121, 7, 123, 7, 125, 7, 127, 7, 130, 7, 131, 21, 131, 21, 181, 21, 181, 21];
const BLOCK_2 = [2, 128, 0, 0, 245, 21, 77, 23, 77, 23, 77, 23, 19, 22, 77, 23, 172, 22, 172, 22, 28, 23, 37, 23, 77, 23, 70, 23, 185, 22, 185, 22, 185, 22, 185, 22, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255];
const BLOCK_REBOOT = [0x01, 0x80, 0x48, 0x00, 0x09, 0x09, 0x0f];

const mockFs = {
  promises: {
    readFile: sinon.stub(),
  },
};

mockery.registerMock('fs', mockFs);

class DummyHID extends EventEmitter {
}
DummyHID.prototype.close = sinon.spy();
DummyHID.prototype.getFeatureReport = sinon.stub();
DummyHID.prototype.sendFeatureReport = sinon.stub();

const mockNodeHID = {
  devices: sinon.stub(),
  HID: DummyHID,
};
mockery.registerMock('node-hid', mockNodeHID);

mockery.enable({
  warnOnUnregistered: false,
});

const BootloadHID = require('../lib/index');

chai.should();

describe('BootloadHID EventEmitter', () => {
  beforeEach(() => {
    this.mod = new BootloadHID({ manualReset: true });

    mockFs.promises.readFile.returns(Buffer.from(DUMMY_HEX));

    mockNodeHID.devices.returns([{ vendorId: 0x16c0, productId: 1503, path: '/tmp/hidraw1' }]);

    DummyHID.prototype.getFeatureReport.returns(Buffer.of(1, 0x80, 0, 0, 0x80, 0, 0, 0));
  });

  afterEach(() => {
    DummyHID.prototype.getFeatureReport.reset();
    DummyHID.prototype.sendFeatureReport.reset();
    sinon.restore();
  });

  it('should flash a BootloadHID device', (done) => {
    this.mod.flash('asdf.hex', (err) => {
      DummyHID.prototype.sendFeatureReport.callCount.should.be.eq(2);
      sinon.assert.calledWithExactly(DummyHID.prototype.sendFeatureReport.getCall(0), BLOCK_1);
      sinon.assert.calledWithExactly(DummyHID.prototype.sendFeatureReport.getCall(1), BLOCK_2);

      done(err);
    });
  });

  it('should reboot a BootloadHID device once finished', (done) => {
    this.mod = new BootloadHID({ manualReset: false });
    this.mod.flash('asdf.hex', (err) => {
      DummyHID.prototype.sendFeatureReport.callCount.should.be.eq(3);
      sinon.assert.calledWithExactly(DummyHID.prototype.sendFeatureReport.getCall(2), BLOCK_REBOOT);

      done(err);
    });
  });

  it('should support custom debuging functions', async () => {
    const logger = sinon.stub();
    this.mod = new BootloadHID({ debug: logger });

    await this.mod.flash('asdf.hex');

    logger.callCount.should.be.greaterThan(0);
  });

  it('should propogate flashing events', async () => {
    const connect = sinon.stub();
    const start = sinon.stub();
    const progress = sinon.stub();
    const finished = sinon.stub();

    this.mod.on('connected', connect);
    this.mod.on('flash:start', start);
    this.mod.on('flash:progress', progress);
    this.mod.on('flash:done', finished);

    await this.mod.flash('asdf.hex');

    connect.callCount.should.be.eq(1);
    start.callCount.should.be.eq(1);
    progress.callCount.should.be.eq(2);
    finished.callCount.should.be.eq(1);
  });

  it('should not flash a non BootloadHID device', (done) => {
    mockNodeHID.devices.returns([{ vendorId: 0x0002, productId: 0x03, path: '/tmp/hidraw3' }]);

    this.mod.flash('asdf.hex', (err) => {
      if (!err) {
        done('flashed wrong device');
      } else {
        done();
      }
    });
  });

  it('should not flash an oversized file', (done) => {
    DummyHID.prototype.getFeatureReport.returns(Buffer.of(1, 0x80, 0, 0x50, 0x8, 0, 0, 0));

    this.mod.flash('asdf.hex', (err) => {
      if (!err) {
        done('flashed oversized file');
      } else {
        done();
      }
    });
  });

  it('should propogate file open errors', (done) => {
    mockFs.promises.readFile.throws();

    this.mod.flash('asdf.hex', (err) => {
      if (!err) {
        done('error expected');
      } else {
        done();
      }
    });
  });

  it('should propogate device open errors');

  it('should propogate device read errors', (done) => {
    DummyHID.prototype.getFeatureReport.throws();

    this.mod.flash('asdf.hex', (err) => {
      if (!err) {
        done('error expected');
      } else {
        done();
      }
    });
  });

  it('should propogate device write errors', (done) => {
    DummyHID.prototype.sendFeatureReport.throws();

    this.mod.flash('asdf.hex', (err) => {
      if (!err) {
        done('error expected');
      } else {
        done();
      }
    });
  });

  it('should list available devices', (done) => {
    mockNodeHID.devices.returns([
      { vendorId: 0x16c0, productId: 1503, path: '/tmp/hidraw1' },
      { vendorId: 0x16c0, productId: 1503, path: '/tmp/hidraw2' },
      { vendorId: 0x0002, productId: 0x03, path: '/tmp/hidraw3' },
    ]);

    BootloadHID.list((err, devices) => {
      devices.should.have.lengthOf(2);
      devices[0].should.have.property('path', '/tmp/hidraw1');
      devices[0].should.have.property('productId', 1503);
      devices[0].should.have.property('vendorId', 5824);
      devices[1].should.have.property('path', '/tmp/hidraw2');
      devices[1].should.have.property('productId', 1503);
      devices[1].should.have.property('vendorId', 5824);
      done(err);
    });
  });
});
