let
  pkgs =
    import (builtins.fetchTarball {
      # Pin nixpkgs for reproducible development environments.
      url = "https://github.com/NixOS/nixpkgs/archive/nixos-25.11.tar.gz";
    }) {
      config.allowUnfree = true;
      config.android_sdk.accept_license = true;
    };
in
  pkgs.mkShell {
    packages = with pkgs; [
      nodejs_20
      # watchman
      jdk17
      git
      androidenv.androidPkgs.androidsdk
      android-tools
    ];

    shellHook = ''
      export NODE_ENV=development
      export ANDROID_SDK_ROOT="${pkgs.androidenv.androidPkgs.androidsdk}/libexec/android-sdk"
      export ANDROID_HOME="$ANDROID_SDK_ROOT"
      export PATH="$ANDROID_SDK_ROOT/platform-tools:$PATH"
      echo "node: $(node --version)"
      echo "npm:  $(npm --version)"
      echo "adb:  $(command -v adb)"
    '';
  }
