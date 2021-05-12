import * as core from '@actions/core';
import { ExecOptions } from '@actions/exec';
import { Globber } from '@actions/glob';
import fs from 'fs';
import fetch from 'node-fetch';
import { VERCEL_CONFIG_FILE } from './config';
import {
  ExecCommandOutput,
  VercelAliasResponse,
  VercelAliasResponseError,
  VercelConfig,
} from './types';

// Must use "require", not compatible with "import"
const exec = require('@actions/exec'); // eslint-disable-line @typescript-eslint/no-var-requires
const glob = require('@actions/glob'); // eslint-disable-line @typescript-eslint/no-var-requires

const generateAliasPromises = (deploymentId: string, teamId: string, aliases: string[]): Promise<VercelAliasResponse>[] => {
  const aliasCreationPromises: Promise<VercelAliasResponse>[] = [];

  for (const alias of aliases) {
    core.debug(`Creating alias ${alias}`);

    aliasCreationPromises.push(
      fetch(`https://api.vercel.com/v2/now/deployments/${deploymentId}/aliases?teamId=${teamId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alias: alias,
        }),
        method: 'POST',
      })
        .then((data) => data.json())
        .catch((e) => core.warning(e)),
    );
  }

  return aliasCreationPromises;
};

export const execCommand = async (command: string): Promise<ExecCommandOutput> => {
  const options: ExecOptions = {};
  let stdout = '';
  let stderr = '';

  /**
   * Listening to both events to store logs and reuse them later
   */
  options.listeners = {
    stdout: (data: Buffer) => {
      stdout += data.toString();
    },
    stderr: (data: Buffer) => {
      stderr += data.toString();
    },
  };

  await exec.exec(command, [], options);

  return { stdout, stderr };
};

const createAliases = async (deploymentUrl: string, customDeploymentFile: string, failIfAliasNotLinked: boolean, extraAliases: string[]): Promise<void> => {
  core.debug(`Starting to link aliases`);

  // Globber is a github action tool https://github.com/actions/toolkit/tree/master/packages/glob
  // It helps us to find the absolute path for a file. Indeed, because we don't know where the action will be run and we need to find this file, wherever it is.
  const globber: Globber = await glob.create(customDeploymentFile);
  const vercelConfigFile: string = (await globber.glob())[0];

  if ((vercelConfigFile && fs.existsSync(vercelConfigFile)) || extraAliases) {
    core.debug(`Found custom config file: ${vercelConfigFile}`);
    core.debug(`Found real path: ${vercelConfigFile}`);
    const vercelConfig: VercelConfig = JSON.parse(fs.readFileSync(vercelConfigFile, 'utf8'));

    if (vercelConfig.alias || extraAliases) {
      const {
        id,
        ownerId,
      } = await fetch(`https://api.vercel.com/v11/now/deployments/get?url=${deploymentUrl.replace('https://', '')}`, {
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        },
        method: 'GET',
      })
        .then((data) => data.json())
        .catch((error) => core.warning(`Did not receive JSON from Vercel API while creating aliases. Message: ${error?.message}`));

      const aliasAsked2: string[] = [...(vercelConfig?.alias || []), ...(extraAliases || [])]
          .filter((alias) => alias ? true : false); // Merge both static and dynamic aliases, and make sure to remove any undefined element
      core.debug(`List of aliases to apply before: ${aliasAsked2}`);
      const aliasAsked: string[] = [...(vercelConfig?.alias || []), ...(extraAliases || [])]
          .filter((alias) => alias ? true : false) // Merge both static and dynamic aliases, and make sure to remove any undefined element
          .map((alias) => alias.substring(0,62)); // According to RFC 1035, each DNS label has a limit of 63 characters
      core.debug(`List of aliases to apply: ${aliasAsked}`);

      const aliasCreationPromises: Promise<VercelAliasResponse>[] = generateAliasPromises(id, ownerId, aliasAsked);
      core.debug(`Resolving alias promises`);

      const aliasesResponse: VercelAliasResponse[] = await Promise.all<VercelAliasResponse>(aliasCreationPromises);
      core.debug(`Alias creation response: ${JSON.stringify(aliasesResponse)}`);
      const aliasesErrors = aliasesResponse.filter((response: VercelAliasResponse) => response.error);
      const aliasesSucceeded = aliasesResponse.filter((response: VercelAliasResponse) => !response.error);

      if (aliasesErrors.length > 0) {
        const failedAliases: (VercelAliasResponseError | undefined)[] = aliasesResponse.filter((response: VercelAliasResponse) => response.error).map((response) => response.error);
        const message = `Got following errors: ${JSON.stringify(failedAliases)}`;

        failIfAliasNotLinked ? core.setFailed(message) : core.warning(message);
        core.debug(`Exporting this error...`);
        core.setOutput('VERCEL_ALIASES_ERROR', failedAliases);
      }

      for (const aliasSuccess of aliasesSucceeded) {
        core.debug(`Created alias "${aliasSuccess?.alias}".`);
      }

      const aliasesUrlsMarkdown: string = aliasesSucceeded.map((aliasSuccess) => `[${aliasSuccess?.alias}](https://${aliasSuccess?.alias})`).join(', ');

      core.setOutput('VERCEL_ALIASES_CREATED', aliasesSucceeded);
      core.exportVariable('VERCEL_ALIASES_CREATED', aliasesSucceeded.map((aliasSuccess) => aliasSuccess?.alias).join(', '));

      core.setOutput('VERCEL_ALIASES_CREATED_URLS_MD', aliasesUrlsMarkdown);
      core.exportVariable('VERCEL_ALIASES_CREATED_URLS_MD', aliasesUrlsMarkdown);

    } else {
      core.warning(`No "alias" key found in ${vercelConfigFile}`);
    }
  } else {
    core.setFailed(`You asked to link aliases but we cannot access to vercel config file "${vercelConfigFile}". Deployment succeeded but no aliases has been created.`);
  }
};

const deploy = async (command: string, applyDomainAliases: boolean, failIfAliasNotLinked: boolean, extraAliases: string[]): Promise<void> => {
  /**
   * Executes the command provided and stores it into a variable, so we can parse the output and extract metadata from it.
   *
   * Running "exec_command" displays the output in the console.
   */
  const commandOutput: ExecCommandOutput = await execCommand(command);
  const stdout: string = commandOutput.stdout;

  /**
   * Parsing this huge output by using Regex match.
   * match function return strings matching with the pattern.
   *
   * Pattern "/https?:\/\/[^ ]+.vercel.app/gi"
   *          "/https?\/\/:" start matching when we find http:// or https://
   *          "[^ ]+.vercel.app" will catch everything as a vercel subdomain, so "*.vercel.app"
   *          "/g" allows us to have many matchess
   *          "i" make the regex case insensitive. It will match for "https://subDomainApp.vercel.app" and "https://subdomainapp.vercel.app"
   *          "shift" returns the first occurence
   */
  const deploymentUrl: string | undefined = stdout.match(/https?:\/\/[^ ]+.vercel.app/gi)?.shift();

  /**
   * Locating any custom config file for Vercel (if you are using one file per customer or deployment for the same app)
   * match function return strings matching with the pattern.
   *
   * Pattern "/--local-config=.[^$]+?.json/gs"
   *          "/--local-config=" starts matching on finding the argument local-config
   *          "[^$]+?.json" with a json file provided as value
   *          "/g" allows us to have many matchess
   *          "s" reduce match scope on the same line
   *          "shift" returns the first occurence
   *          "split" isolates the json file
   *          "find" automatically finds the matching json file
   */
  const customDeploymentFile: string = stdout.match(/--local-config=.[^$]+?.json/gs)?.shift()?.split('=').find((el) => el.endsWith('.json')) || VERCEL_CONFIG_FILE;

  core.debug(`Command: ${command}`);
  core.debug(`Custom deploy file: ${customDeploymentFile}`);

  if (deploymentUrl) {
    const deploymentDomain: string = deploymentUrl.replace('https://', '');
    core.debug(`Found url deployment. Exporting it...`);
    core.debug(`VERCEL_DEPLOYMENT_URL=${deploymentUrl}`);

    core.exportVariable('VERCEL_DEPLOYMENT_URL', deploymentUrl);
    core.setOutput('VERCEL_DEPLOYMENT_URL', deploymentUrl);
    core.debug(`VERCEL_DEPLOYMENT_DOMAIN=${deploymentDomain}`);

    core.exportVariable('VERCEL_DEPLOYMENT_DOMAIN', deploymentDomain);
    core.setOutput('VERCEL_DEPLOYMENT_DOMAIN', deploymentDomain);

    if (applyDomainAliases || extraAliases) {
      await createAliases(deploymentUrl, customDeploymentFile, failIfAliasNotLinked, extraAliases);
    }
  } else {
    core.setFailed(`"Error during command execution, cannot find any url matching (using a regex to retrieve a url as "https://*.vercel.app"`);
  }
};

export default deploy;
