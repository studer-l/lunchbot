#!/usr/bin/env sh
# updates dependencies in both package.json and the nix files
# deletes node_modules and re-installs it
set -e
pushd ..
npm-check-updates -u
rm -rf node_modules
node2nix -d -18 -o nix/dev/node-packages.nix  -c nix/dev/default.nix  -e nix/dev/node-env.nix
node2nix    -18 -o nix/prod/node-packages.nix -c nix/prod/default.nix -e nix/prod/node-env.nix
npm i
