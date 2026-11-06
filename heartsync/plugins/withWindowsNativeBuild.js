const { withProjectBuildGradle } = require('expo/config-plugins');

const start = '// @generated begin heartsync-windows-native';
const end = '// @generated end heartsync-windows-native';
const gradle = `
${start}
// Windows: retain C++ driver mode even when CMake invokes clang++.exe through
// an 8.3 alias, and place app CMake artifacts beside the checkout rather than
// under android/app. This keeps ARM64 object paths under Windows' 260 limit.
if (System.getProperty('os.name').toLowerCase().contains('windows')) {
    subprojects { nativeProject ->
        ['com.android.application', 'com.android.library'].each { pluginId ->
            nativeProject.plugins.withId(pluginId) {
                nativeProject.extensions.getByName('androidComponents').finalizeDsl { androidDsl ->
                    def cmake = androidDsl.defaultConfig.externalNativeBuild.cmake
                    cmake.arguments.removeAll { it.startsWith('-DCMAKE_OBJECT_PATH_MAX=') || it.startsWith('-DCMAKE_CXX_FLAGS=') }
                    cmake.arguments.addAll(['-DCMAKE_OBJECT_PATH_MAX=240', '-DCMAKE_CXX_FLAGS=--driver-mode=g++'])
                    if (pluginId == 'com.android.application') {
                        def workspaceParent = nativeProject.rootProject.projectDir.parentFile.parentFile.parentFile
                        androidDsl.externalNativeBuild.cmake.buildStagingDirectory = new File(workspaceParent, ".hs/\${nativeProject.rootProject.name}/\${nativeProject.name}")
                    }
                    nativeProject.logger.lifecycle('[HeartSync] Windows C++ configuration: ' + nativeProject.path)
                }
            }
        }
    }
}
${end}
`;

module.exports = function withWindowsNativeBuild(config) {
  return withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('HeartSync Windows native build plugin requires Groovy build.gradle.');
    }
    let contents = mod.modResults.contents;
    const begin = contents.indexOf(start);
    const finish = contents.indexOf(end);
    if (begin >= 0 && finish >= begin) {
      contents = contents.slice(0, begin) + contents.slice(finish + end.length);
    }
    const anchor = contents.indexOf('apply plugin: \"expo-root-project\"');
    if (anchor < 0) throw new Error('Expo root plugin anchor missing; review Windows native build configuration.');
    mod.modResults.contents = contents.slice(0, anchor).trimEnd() + '\n' + gradle + '\n' + contents.slice(anchor).trimStart();
    return mod;
  });
};
