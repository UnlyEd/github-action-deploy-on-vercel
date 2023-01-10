import { execCommand } from '../src/vercel';
import { ExecCommandOutput } from '../src/types';

/**
 * Enhance the Node.js environment "global" variable to add our own types
 *
 * @see https://stackoverflow.com/a/42304473/2391795
 */
declare global {
  let muteConsole: () => any;
  let muteConsoleButLog: () => any;
  let unmuteConsole: () => any;
}

describe('Unit test', () => {
  describe('should pass when', () => {
    beforeEach(() => {
      // @ts-ignore
      global.console = global.unmuteConsole();
    });

    describe('using our tool', () => {
      test('with command "vercel --version" to make sure Vercel binary is installed', async () => {
        const execOutput: ExecCommandOutput = await execCommand('vercel --version');
        expect(
          execOutput.stderr.includes('Vercel CLI'),
          'Vercel binary might not have been installed, try installing it globally using "yarn global add vercel".',
        ).toBe(true);
      });
    });
  });
});

export default {};
