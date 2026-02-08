{
  description = "A Node.js/TypeScript/Vite development environment with Bun";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Bun runtime and package manager
            bun

            # TypeScript tooling
            nodePackages.typescript
            nodePackages.typescript-language-server

            # Development tools
            nodePackages.prettier
            nodePackages.eslint
          ];

          shellHook = ''
            echo "Bun development environment loaded"
            echo "Bun version: $(bun --version)"
            echo ""
            echo "Available commands:"
            echo "  bun install   - Install dependencies"
            echo "  bun dev       - Start Vite dev server"
            echo "  bun run build - Build for production"
            echo "  bun preview   - Preview production build"
          '';

          # Environment variables
          NODE_ENV = "development";
        };
      }
    );
}
