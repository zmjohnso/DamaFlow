const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

// android/ is regenerated from scratch by `expo prebuild` (it's gitignored, not
// committed) — this plugin re-applies our release-build customizations every time
// that happens, since hand-editing the generated build.gradle doesn't survive a
// fresh prebuild. See CLAUDE.md's Release Process section for the full picture.
function withReleaseConfig(config) {
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;
    const ensure = (key, value) => {
      if (!props.some((p) => p.type === 'property' && p.key === key)) {
        props.push({ type: 'property', key, value });
      }
    };
    // Real device release APKs only — x86/x86_64 are emulator-only architectures
    // and roughly double APK size for zero benefit to real users (NFR5, 50MB budget).
    // Local `npm run android` / emulator builds are unaffected; this only changes
    // what `-PreactNativeArchitectures=armeabi-v7a,arm64-v8a` overrides at release-build time.
    ensure('android.enableMinifyInReleaseBuilds', 'true');
    ensure('android.enableShrinkResourcesInReleaseBuilds', 'true');
    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // --- versionCode / versionName overridable via -Pandroid.versionCode / -Pandroid.versionName ---
    // CI derives these from the release git tag; local builds without the property fall back to 1 / 1.0.0.
    const minifyAnchor =
      "def enableMinifyInReleaseBuilds = (findProperty('android.enableMinifyInReleaseBuilds') ?: false).toBoolean()";
    if (contents.includes(minifyAnchor) && !contents.includes('resolvedVersionCode')) {
      contents = contents.replace(
        minifyAnchor,
        `${minifyAnchor}\n\ndef resolvedVersionCode = (findProperty('android.versionCode') ?: '1').toString().toInteger()\ndef resolvedVersionName = (findProperty('android.versionName') ?: '1.0.0').toString()`,
      );
    }
    contents = contents.replace('versionCode 1', 'versionCode resolvedVersionCode');
    contents = contents.replace('versionName "1.0.0"', 'versionName resolvedVersionName');

    // --- Real release signing, sourced from env vars CI sets from GitHub Actions secrets. ---
    // Never hardcoded, never committed. Falls back to the debug keystore below when unset,
    // so local dev builds (npm run android, etc.) are unaffected.
    const debugSigningBlock = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;
    const withReleaseSigningBlock = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            def storeFilePath = System.getenv("DAMAFLOW_RELEASE_STORE_FILE")
            if (storeFilePath) {
                storeFile file(storeFilePath)
                storePassword System.getenv("DAMAFLOW_RELEASE_STORE_PASSWORD")
                keyAlias System.getenv("DAMAFLOW_RELEASE_KEY_ALIAS")
                keyPassword System.getenv("DAMAFLOW_RELEASE_KEY_PASSWORD")
            }
        }
    }`;
    if (contents.includes(debugSigningBlock)) {
      contents = contents.replace(debugSigningBlock, withReleaseSigningBlock);
    }

    contents = contents.replace(
      `release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`,
      `release {
            signingConfig System.getenv("DAMAFLOW_RELEASE_STORE_FILE") ? signingConfigs.release : signingConfigs.debug`,
    );

    config.modResults.contents = contents;
    return config;
  });

  return config;
}

module.exports = withReleaseConfig;
