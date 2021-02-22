/**
 * Directory where the compiled version (JS) of the TS code is stored.
 *
 * XXX Should match the package.json:main value.
 */
export const BUILD_DIR = 'lib';

/**
 * Name of the Action's entrypoint.
 *
 * XXX Should match the package.json:main value.
 */
export const BUILD_MAIN_FILENAME = 'main.js';

/**
 * Default Vercel config file to lookup when there is no file provided with '--local-config'
 *
 */
export const VERCEL_CONFIG_FILE = 'vercel.json';