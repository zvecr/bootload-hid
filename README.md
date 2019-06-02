# bootload-hid
> Library for flashing BootloadHID devices

[![Build Status](https://travis-ci.org/zvecr/bootload-hid.svg?branch=master)](https://travis-ci.org/zvecr/bootload-hid)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=zvecr/bootload-hid)](https://dependabot.com)

<span style="font-size:200%;color:red">CURRENTLY ALPHA: USE AT OWN RISK</span>

NodeJS implementation of <https://www.obdev.at/products/vusb/bootloadhid.html>.

## Install

```shell
$ npm install bootload-hid
```

## Usage

List available devices
```js
const BootloadHID = require('bootload-hid');

BootloadHID.list((err, devices) => {
    console.log('devices', devices);
});
```

Flash the first found device
```js
const BootloadHID = require('bootload-hid');

const loader = new BootloadHID({
    debug: true,
    manualReset: false,
});

// GO....
loader.flash(args.file, (error) => {
    if (error) {
        console.error(error.message);
    } else {
        console.info('done.');
    }
});
```
