# bootload-hid
> Library for flashing BootloadHID devices

[![npm version](https://badge.fury.io/js/bootload-hid.svg)](https://badge.fury.io/js/bootload-hid)
[![Build Status](https://travis-ci.org/zvecr/bootload-hid.svg?branch=master)](https://travis-ci.org/zvecr/bootload-hid)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/5781a92ff0dc4047ba80b5af9f022d97)](https://www.codacy.com/app/zvecr/bootload-hid?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=zvecr/bootload-hid&amp;utm_campaign=Badge_Grade)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=zvecr/bootload-hid)](https://dependabot.com)
![Code Status](https://img.shields.io/badge/status-beta-yellow.svg)

## CURRENTLY BETA: USE AT OWN RISK

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
