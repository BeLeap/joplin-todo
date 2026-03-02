let
  pkgs = import (builtins.fetchTarball {
    # Pin nixpkgs for reproducible development environments.
    url = "https://github.com/NixOS/nixpkgs/archive/nixos-25.11.tar.gz";
  }) {};
in
  pkgs.mkShell {
    packages = with pkgs; [
      nodejs_20
      watchman
      jdk17
      git
    ];

    shellHook = ''
      export NODE_ENV=development
      echo "Node: $(node --version)"
      echo "npm:  $(npm --version)"
    '';
  }
