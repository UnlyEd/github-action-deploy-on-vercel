import { execCommand } from "../src/vercel";
import { ExecCommandOutput } from "../src/types";

/**
 * Enhance the Node.js environment "global" variable to add our own types
 *
 * @see https://stackoverflow.com/a/42304473/2391795
 */
declare global {
  namespace NodeJS {
    interface Global {
      muteConsole: () => any;
      muteConsoleButLog: () => any;
      unmuteConsole: () => any;
    }
  }
}

describe('Unit test', () => {
  describe('should pass when', () => {
    beforeEach(() => {
      global.console = global.unmuteConsole();
    });

    describe('using your tool', () => {
      test('with command "vercel --version" to make sure Vercel binary is installed', async () => {
        const execOutput: ExecCommandOutput = await execCommand("vercel --version");
        expect(execOutput.stderr.includes('Vercel CLI')).toBe(true);
      });
    });
  });
});

export default {};
