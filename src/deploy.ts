import exec, {ExecOptions} from '@actions/exec';


const deploy = async (command: string, deploy_alias: boolean): Promise<void> => {
    let stdout: string = '';
    let stderr: string = '';

    const options: ExecOptions = {};
    options.listeners = {
        stdout: (data: Buffer) => {
            stdout += data.toString();
        },
        stderr: (data: Buffer) => {
            stderr += data.toString();
        }
    };
    options.env = {
        "VERCEL_TOKEN": "process.env.VERCEL_TOKEN"
    }

    await exec.exec(command, [], options);

    console.log(`Found stdout: ${stdout}`)
    console.log(`Found sterr: ${stderr}`)

}

export default deploy;