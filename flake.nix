{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    flake-parts.url = "github:hercules-ci/flake-parts";
    process-compose-flake.url = "github:Platonic-Systems/process-compose-flake";
    services-flake.url = "github:juspay/services-flake";
    systems.url = "github:nix-systems/default";
    gitignore = {
      url = "github:hercules-ci/gitignore.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ inputs.process-compose-flake.flakeModule ];
      systems = import inputs.systems;
      perSystem = { self', pkgs, lib, system, ... }:
        let version = "0.2.0";
        in rec {
          process-compose.develop = {
            imports = [ inputs.services-flake.processComposeModules.default ];
            services.postgres."lunchbot-db" = {
              enable = true;
              socketDir = "/tmp/lunchbot-db";
            };
          };
          devShells.default = pkgs.mkShell {
            packages = with pkgs; [
              jq
              nixfmt-classic
              nodePackages.node2nix
              nodePackages.prettier
              nodePackages.typescript-language-server
              nodejs
              npm-check-updates
              postgresql
              typescript
            ];
            # matches database launched by `nix run .#develop`
            LUNCHBOT_DB_URL = "postgres://?host=/tmp/lunchbot-db";
          };

          packages.default = let
            nodejs = pkgs.nodejs;

            # development env with type defintions; yes this is a mess
            n2nDev = import ./nix/dev { inherit pkgs nodejs system; };
            npDev = n2nDev // {
              nodeDependencies = n2nDev.nodeDependencies.override {
                # libpq requires postgres and the  `which` command
                buildInputs = [ pkgs.postgresql pkgs.which ];
              };
            };

            # production / deployment env
            n2nProd = import ./nix/prod { inherit pkgs nodejs system; };
            npProd = n2nDev // {
              nodeDependencies = n2nProd.nodeDependencies.override {
                # libpq requires postgres and the  `which` command
                buildInputs = [ pkgs.postgresql pkgs.which ];
              };
            };

            devDeps = npDev.nodeDependencies;
            prodDeps = npProd.nodeDependencies;

            app = pkgs.stdenv.mkDerivation {
              name = "lunchbot";
              version = version;
              src = inputs.gitignore.lib.gitignoreSource ./.;
              buildInputs = [ nodejs pkgs.postgresql ];
              buildPhase = ''
                runHook preBuild

                # symlink the development node deps to the current directory for building
                ln -sf ${devDeps}/lib/node_modules ./node_modules
                export PATH="${devDeps}/bin:$PATH"

                npm run build

                runHook postBuild
              '';
              installPhase = ''
                runHook preInstall

                mkdir -p $out/bin

                # copy only whats needed for running the built app
                cp package.json $out/package.json
                cp -r dist $out/dist
                ln -sf ${prodDeps}/lib/node_modules $out/node_modules

                # copy entry point, in this case our index.ts has the node shebang
                # nix will patch the shebang to be the node version specified in buildInputs
                # you could also copy in a script that is basically `npm run start`
                ln -s $out/dist/index.js $out/bin/lunchbot
                chmod a+x $out/bin/lunchbot

                runHook postInstall
              '';
            };
          in app;

          packages.docker = pkgs.dockerTools.buildLayeredImage {
            name = "studerl/lunchbot";
            tag = version;
            config.Cmd = [ "${packages.default}/bin/lunchbot" ];
            contents = with pkgs.dockerTools; [ caCertificates ];
          };
        };
    };
}
