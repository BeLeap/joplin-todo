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
      android-tools
    ];

    shellHook = ''
      export NODE_ENV=development
      if [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
      elif [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
      fi
      if [ -n "$ANDROID_SDK_ROOT" ]; then
        export ANDROID_HOME="$ANDROID_SDK_ROOT"
        export PATH="$ANDROID_SDK_ROOT/platform-tools:$PATH"
      fi
      echo "node: $(node --version)"
      echo "npm:  $(npm --version)"
      echo "adb:  $(command -v adb)"
    '';
  }
