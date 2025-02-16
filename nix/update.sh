#!/usr/bin/env sh
# change to git root
pushd $(git rev-parse --show-toplevel)
node2nix --nodejs-18 -d -o nix/dev/node-packages.nix  -c nix/dev/default.nix  -e nix/dev/node-env.nix
node2nix --nodejs-18    -o nix/prod/node-packages.nix -c nix/prod/default.nix -e nix/prod/node-env.nix
popd
