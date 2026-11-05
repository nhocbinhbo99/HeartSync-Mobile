/* global jest, it, expect */
jest.mock('expo/config-plugins', () => ({
  withProjectBuildGradle: (config, action) => action(config),
}));
const withWindowsNativeBuild = require('../withWindowsNativeBuild');
const original = 'buildscript {}\napply plugin: "expo-root-project"\napply plugin: "com.facebook.react.rootproject"\n';
function apply(contents = original, language = 'groovy') {
  return withWindowsNativeBuild({ modResults: { language, contents } }).modResults.contents;
}
it('registers Windows DSL hooks before Expo evaluates native subprojects', () => {
  const result = apply();
  expect(result.indexOf('finalizeDsl')).toBeLessThan(result.indexOf('apply plugin: "expo-root-project"'));
  expect(result).toContain('CMAKE_CXX_FLAGS=--driver-mode=g++');
  expect(result).toContain('CMAKE_OBJECT_PATH_MAX=240');
});
it('can prebuild repeatedly without duplicating the workaround', () => {
  expect(apply(apply())).toBe(apply());
});
it('rejects a changed native template rather than silently skipping the fix', () => {
  expect(() => apply('plugins {}', 'kotlin')).toThrow('Groovy');
  expect(() => apply('plugins {}')).toThrow('anchor missing');
});

