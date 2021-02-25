import * as core from '@actions/core';
import {ExecOptions} from '@actions/exec';
import {Globber} from "@actions/glob";

import fs from 'fs';
import fetch, {Response} from "node-fetch";

import {VercelAliasResponse, VercelAliasResponseError, VercelConfig} from "./types";
import {VERCEL_CONFIG_FILE} from "./config";

const exec = require('@actions/exec');
const glob = require('@actions/glob');

const generate_alias_promises = (deploymentId: string, teamId: string, aliases: string[]): Promise<VercelAliasResponse>[] => {
    let aliasCreationPromises: Promise<VercelAliasResponse>[] = [];
    for (const alias of aliases) {
        console.log(`Creating alias ${alias}`);
        aliasCreationPromises.push(fetch(`https://api.vercel.com/v2/now/deployments/${deploymentId}/aliases?teamId=${teamId}`, {
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
    return aliasCreationPromises;
}

const exec_command = async (command: string): Promise<string> => {
    /**
     * When we execute a program, it writes on two outputs : standard and error.
     * Initalizing empty variables to receive these outputs
     */
    let stdout: string = '';
    let stderr: string = '';

    const options: ExecOptions = {};
    /**
     * Defining actions for both outputs
     */
    options.listeners = {
        stdout: (data: Buffer) => {
            stdout += data.toString();
        },
        stderr: (data: Buffer) => {
            stderr += data.toString();
        }
    };
    await exec.exec(command, [], options);
    return stdout
}

const create_aliases = async (deploymentUrl: string, customDeploymentFile: string | undefined, failIfAliasNotLinked: boolean): Promise<void> => {
    core.debug(`Starting to link aliases`);
    /**
     * Globber is a github action tool https://github.com/actions/toolkit/tree/master/packages/glob
     * It helps us to find the absolute path for a file. Indeed, because we don't know where the action will be run and we need to find this file, wherever it is.
     */
    const globber: Globber = await glob.create(customDeploymentFile)
    const vercelConfigFile: string = (await globber.glob())[0];
    if (vercelConfigFile && fs.existsSync(vercelConfigFile)) {
        core.debug(`Found custom config file: ${vercelConfigFile}`);
        core.debug(`Found real path: ${vercelConfigFile}`);
        const vercelConfig: VercelConfig = JSON.parse(fs.readFileSync(vercelConfigFile, 'utf8'));
        if (vercelConfig.alias) {
            const {
                id,
                ownerId
            } = (await fetch(`https://api.vercel.com/v11/now/deployments/get?url=${deploymentUrl.replace("https://", "")}`, {
                headers: {
                    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`
                },
                method: 'GET'
            }).then(data => data.json()));
            const aliasCreationPromises: Promise<VercelAliasResponse>[] = generate_alias_promises(id, ownerId, vercelConfig.alias);
            core.debug(`Resolving alias promises`);
            const aliasesResponse: VercelAliasResponse[] = await Promise.all<VercelAliasResponse>(aliasCreationPromises);
            console.log(`Alias creation response: ${JSON.stringify(aliasesResponse)}`);
            if (aliasesResponse.filter(response => response.error)) {
                const failedAliases: (VercelAliasResponseError | undefined)[] = aliasesResponse.filter((response: VercelAliasResponse) => response.error).map((response) => response.error);
                const message: string = `Got following errors: ${JSON.stringify(failedAliases)}`
                failIfAliasNotLinked ? core.setFailed(message) : core.warning(message)
            }
            for (const alias of aliasesResponse.filter(response => !response.error)) {
                console.log(`Created alias ${alias}`);
            }
        } else {
            core.warning(`No "alias" key found in ${vercelConfigFile}`);
        }
    } else {
        core.setFailed(`You asked to link aliases but we cannot access to vercel config file "${vercelConfigFile}". Deployment succeeded but no aliases has been created.`)
    }
}

const deploy = async (command: string, deployAlias: boolean, failIfAliasNotLinked: boolean): Promise<void> => {
    const stdout: string = await exec_command(command)

    /**
     * Parsing this huge output by using Regex match.
     * match function return strings matching with the pattern.
     * Pattern "/https?:\/\/[^ ]+.vercel.app/gi"
     *          "/https?\/\/:" start matching when we find http:// or https://
     *          "[^ ]+.vercel.app" will catch everything as a vercel subdomain, so "*.vercel.app"
     *          "/g" allows us to have many matchess
     *          "i" make the regex case insensitive. It will match for "https://subDomainApp.vercel.app" and "https://subdomainapp.vercel.app"
     * shift returns the first occurence
     */
    const deploymentUrl: string | undefined = stdout.match(/https?:\/\/[^ ]+.vercel.app/gi)?.shift();

    /**
     * Locating any custom config file for Vercel (if you are using one file per customer or deployment for the same app)
     * match function return strings matching with the pattern.
     * Pattern "/--local-config=.[^$]+?.json/gs"
     *          "/--local-config=" starts matching on finding the argument local-config
     *          "[^$]+?.json" with a json file provided as value
     *          "/g" allows us to have many matchess
     *          "s" reduce match scope on the same line
     * shift returns the first occurence
     * split isolates the json file
     * find automatically finds the matching json file
     */
    const customDeploymentFile: string = stdout.match(/--local-config=.[^$]+?.json/gs)?.shift()?.split("=").find(el => el.endsWith(".json"))  || VERCEL_CONFIG_FILE;

    core.debug(`Command: ${command}`)
    core.debug(`Custom deploy file: ${customDeploymentFile}`);

    if (deploymentUrl) {
        const deploymentDomain: string = deploymentUrl.replace("https://", "");
        console.log(`Found url deployment. Exporting it...`);
        console.log(`VERCEL_DEPLOYMENT_URL=${deploymentUrl}`);
        core.exportVariable("VERCEL_DEPLOYMENT_URL", deploymentUrl);
        core.setOutput("VERCEL_DEPLOYMENT_URL", deploymentUrl);
        console.log(`VERCEL_DEPLOYMENT_DOMAIN=${deploymentDomain}`);
        core.exportVariable("VERCEL_DEPLOYMENT_DOMAIN", deploymentDomain);
        core.setOutput("VERCEL_DEPLOYMENT_DOMAIN", deploymentDomain);
        if (deployAlias) {
            await create_aliases(deploymentUrl, customDeploymentFile, failIfAliasNotLinked);
        }
    } else {
        core.setFailed(`"Error during command execution, cannot find any url matching (using a regex to retrieve a url as "https://*.vercel.app"`);
    }
}

export default deploy;