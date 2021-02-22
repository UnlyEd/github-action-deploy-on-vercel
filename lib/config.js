"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERCEL_CONFIG_FILE = exports.BUILD_MAIN_FILENAME = exports.BUILD_DIR = void 0;
/**
 * Directory where the compiled version (JS) of the TS code is stored.
 *
 * XXX Should match the package.json:main value.
 */
exports.BUILD_DIR = 'lib';
/**
 * Name of the Action's entrypoint.
 *
 * XXX Should match the package.json:main value.
 */
exports.BUILD_MAIN_FILENAME = 'main.js';
/**
 * Default Vercel config file to lookup when there is no file provided with '--local-config'
 *
 */
exports.VERCEL_CONFIG_FILE = 'vercel.json';
