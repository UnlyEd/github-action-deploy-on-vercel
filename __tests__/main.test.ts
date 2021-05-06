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

describe('Functional test', () => {
  /*describe('should pass when', () => {
    beforeEach(() => {
      global.console = global.unmuteConsole();
    });

    describe('using special delimiter', () => {
      const options: cp.ExecFileSyncOptions = {
        env: {
          INPUT_VARIABLES: 'VAR=TEST,OTHER_VAR=OTHER_TEST,RETRIEVE',
          INPUT_DELIMITER: ',',
        },
      };
      const filteredContent = exec_lib(options);
      test('test', () => {
        expect(filteredContent.includes(',')).toBe(true);
        console.log(filteredContent);
      });
    });
  });*/
});

export default {};
