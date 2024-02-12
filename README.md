# True Color Invert

GNOME shell extension for night shift on usb monitor. To start it press Super + I.

https://extensions.gnome.org/extension/3530/true-color-invert/

## How to use it
Open window at usb monitor and press `Super + I` to add night filter. Press `Super + I` multiple times to remove night filter.

## Keyboard Shortcut

`Super + I`

## Debugging

Errors will print out here:
```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

## Contributing

Before submitting pull requests, please run:

```bash
glib-compile-schemas schemas/
```

To recompile the `gschemas`.

## Building for Release

To make the ZIP for the GNOME Shell Extension website: 

1. `sh build.sh`
2. Tag `main` at that time with a release tag according to the revisions made.


## Installing 
1. `gnome-extensions install -f ./true-color-invert@jackkenney.zip`
