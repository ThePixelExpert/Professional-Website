{
  description = "Nix flake for ThePixelExpert/Professional-Website — development shell providing Node, package managers and common tooling";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        lib  = pkgs.lib;

        node = pkgs.nodejs-18_x;

        commonTools = with pkgs; [
          node
          yarn
          pnpm
          git
          jq
          curl
          direnv
          make
        ];
      in {
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "professional-website-toolset";
          version = "0.1.0";
          buildInputs = commonTools;
          meta.description = "Convenience wrapper package for developer tools (not normally built).";
        };

        devShells.default = pkgs.mkShell {
          name = "professional-website-devshell";
          buildInputs = commonTools;

          shellHook = ''
            if [ -t 1 ]; then
              echo "Entering Professional-Website development shell (node=$(node --version 2>/dev/null || echo 'none'))"
            fi
            export NODE_ENV=development
            if [ -f ./scripts/setup-dev-env.sh ]; then
              echo "Run ./scripts/setup-dev-env.sh to fetch secrets (requires Bitwarden CLI 'bw')."
            fi
            if command -v direnv >/dev/null 2>&1; then
              eval "$(direnv hook bash 2>/dev/null || true)"
            fi
          '';
        };

        defaultPackage = self.packages.${system}.default;
      }
    );
}
