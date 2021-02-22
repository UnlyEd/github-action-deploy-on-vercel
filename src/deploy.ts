import * as core from '@actions/core';
import {ExecOptions} from '@actions/exec';
import {Globber} from "@actions/glob";

import fs from 'fs';
import fetch, {Response} from "node-fetch";

import {VercelConfig} from "./types";
import {VERCEL_CONFIG_FILE} from "./config";

const exec = require('@actions/exec');
const glob = require('@actions/glob');

const exec_command = async (command: string): Promise<string> => {
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
    await exec.exec('npx -v');
    await exec.exec('yarn global add npx');
    await exec.exec('npx -v');
    await exec.exec(command, [], options);
    console.log(stdout, stderr);
    console.log("Stdout: ", stdout);
    console.log("Stderr: ", stderr);
    return stdout
}

const deploy = async (command: string, deployAlias: boolean): Promise<void> => {
    const stdout: string = await exec_command(command)

    const deploymentUrl: string | undefined = stdout.match(/https?:\/\/[^ ]+.vercel.app/gi)?.shift();
    const customDeploymentFile: any = command.match(/--local-config=([^,]+).json/g)?.shift()?.split("=").find(el => el.endsWith(".json"));

    if (deploymentUrl) {
        core.debug(`Found url deployment: ${deploymentUrl}. Exporting it...`);
        core.exportVariable("deploymentUrl", deploymentUrl);
        core.setOutput("deploymentUrl", deploymentUrl);
        if (deployAlias) {
            core.debug(`Starting to link aliases`);
            const globber: Globber = await glob.create(customDeploymentFile)
            const vercelConfigFile: string = (await globber.glob())[0] || VERCEL_CONFIG_FILE;
            if (vercelConfigFile && fs.existsSync(vercelConfigFile)) {
                core.debug(`Found custom config file: ${vercelConfigFile}`);
                core.debug(`Found real path: ${vercelConfigFile}`);
                const vercelConfig: VercelConfig = JSON.parse(fs.readFileSync(vercelConfigFile, 'utf8'));
                const {
                    id,
                    ownerId
                } = (await fetch(`https://api.vercel.com/v11/now/deployments/get?url=${deploymentUrl.replace("https://", "")}`, {
                    headers: {
                        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`
                    },
                    method: 'GET'
                }).then(data => data.json()));
                let aliasCreationPromises: Promise<Response>[] = [];
                for (const alias of vercelConfig.alias) {
                    console.log(`Creating alias ${alias}`);
                    aliasCreationPromises.push(fetch(`https://api.vercel.com/v2/now/deployments/${id}/aliases?teamId=${ownerId}`, {
                        headers: {
                            Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            alias: alias
                        }),
                        method: 'POST'
                    }).then(data => data.json()));
                }
                core.debug(`Resolving alias promises`);
                core.debug(Object(await Promise.all(aliasCreationPromises)));
            } else {
                core.setFailed(`Cannot access to vercel config file "${vercelConfigFile}". Deployment succeeded but no aliases has been created.`)
            }
        }
    } else {
        core.setFailed(`"Error during command execution, cannot find any url matching (using a regex to retrieve a url as "https://*.vercel.app"`);
    }
}

export default deploy;