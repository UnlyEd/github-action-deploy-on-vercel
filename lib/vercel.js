"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execCommand = void 0;
const core = __importStar(require("@actions/core"));
const fs_1 = __importDefault(require("fs"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const config_1 = require("./config");
// Must use "require", not compatible with "import"
const exec = require('@actions/exec'); // eslint-disable-line @typescript-eslint/no-var-requires
const glob = require('@actions/glob'); // eslint-disable-line @typescript-eslint/no-var-requires
const generateAliasPromises = (deploymentId, teamId, aliases) => {
    const aliasCreationPromises = [];
    for (const alias of aliases) {
        core.debug(`Creating alias ${alias}`);
        aliasCreationPromises.push(node_fetch_1.default(`https://api.vercel.com/v2/now/deployments/${deploymentId}/aliases?teamId=${teamId}`, {
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
            .catch((e) => core.warning(e)));
    }
    return aliasCreationPromises;
};
const execCommand = (command) => __awaiter(void 0, void 0, void 0, function* () {
    const options = {};
    let stdout = '';
    let stderr = '';
    /**
     * Listening to both events to store logs and reuse them later
     */
    options.listeners = {
        stdout: (data) => {
            stdout += data.toString();
        },
        stderr: (data) => {
            stderr += data.toString();
        },
    };
    yield exec.exec(command, [], options);
    return { stdout, stderr };
});
exports.execCommand = execCommand;
const createAliases = (deploymentUrl, customDeploymentFile, failIfAliasNotLinked, extraAliases) => __awaiter(void 0, void 0, void 0, function* () {
    core.debug(`Starting to link aliases`);
    // Globber is a github action tool https://github.com/actions/toolkit/tree/master/packages/glob
    // It helps us to find the absolute path for a file. Indeed, because we don't know where the action will be run and we need to find this file, wherever it is.
    const globber = yield glob.create(customDeploymentFile);
    const vercelConfigFile = (yield globber.glob())[0];
    if ((vercelConfigFile && fs_1.default.existsSync(vercelConfigFile)) || extraAliases) {
        core.debug(`Found custom config file: ${vercelConfigFile}`);
        core.debug(`Found real path: ${vercelConfigFile}`);
        const vercelConfig = JSON.parse(fs_1.default.readFileSync(vercelConfigFile, 'utf8'));
        if (vercelConfig.alias || extraAliases) {
            const { id, ownerId, } = yield node_fetch_1.default(`https://api.vercel.com/v11/now/deployments/get?url=${deploymentUrl.replace('https://', '')}`, {
                headers: {
                    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
                },
                method: 'GET',
            })
                .then((data) => data.json())
                .catch((error) => core.warning(`Did not receive JSON from Vercel API while creating aliases. Message: ${error === null || error === void 0 ? void 0 : error.message}`));
            const aliasAsked = [vercelConfig.alias, extraAliases].reduce((accumulator, value) => accumulator.concat(value), []).filter((alias) => alias ? true : false); // Merge both static and dynamic aliases, and make sure to remove any undefined element.
            core.debug(`List of aliases to apply: ${aliasAsked}`);
            const aliasCreationPromises = generateAliasPromises(id, ownerId, aliasAsked);
            core.debug(`Resolving alias promises`);
            const aliasesResponse = yield Promise.all(aliasCreationPromises);
            core.debug(`Alias creation response: ${JSON.stringify(aliasesResponse)}`);
            const aliasesErrors = aliasesResponse.filter((response) => response.error);
            const aliasesSucceeded = aliasesResponse.filter((response) => !response.error);
            if (aliasesErrors.length > 0) {
                const failedAliases = aliasesResponse.filter((response) => response.error).map((response) => response.error);
                const message = `Got following errors: ${JSON.stringify(failedAliases)}`;
                failIfAliasNotLinked ? core.setFailed(message) : core.warning(message);
                core.debug(`Exporting this error...`);
                core.setOutput('VERCEL_ALIASES_ERROR', failedAliases);
            }
            for (const aliasSuccess of aliasesSucceeded) {
                core.debug(`Created alias "${aliasSuccess === null || aliasSuccess === void 0 ? void 0 : aliasSuccess.alias}".`);
            }
            const aliasesUrlsMarkdown = aliasesSucceeded.map((aliasSuccess) => `[${aliasSuccess === null || aliasSuccess === void 0 ? void 0 : aliasSuccess.alias}](https://${aliasSuccess === null || aliasSuccess === void 0 ? void 0 : aliasSuccess.alias})`).join(', ');
            core.setOutput('VERCEL_ALIASES_CREATED', aliasesSucceeded);
            core.exportVariable('VERCEL_ALIASES_CREATED', aliasesSucceeded.map((aliasSuccess) => aliasSuccess === null || aliasSuccess === void 0 ? void 0 : aliasSuccess.alias).join(', '));
            core.setOutput('VERCEL_ALIASES_CREATED_URLS_MD', aliasesUrlsMarkdown);
            core.exportVariable('VERCEL_ALIASES_CREATED_URLS_MD', aliasesUrlsMarkdown);
        }
        else {
            core.warning(`No "alias" key found in ${vercelConfigFile}`);
        }
    }
    else {
        core.setFailed(`You asked to link aliases but we cannot access to vercel config file "${vercelConfigFile}". Deployment succeeded but no aliases has been created.`);
    }
});
const deploy = (command, applyDomainAliases, failIfAliasNotLinked, extraAliases) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    /**
     * Executes the command provided and stores it into a variable, so we can parse the output and extract metadata from it.
     *
     * Running "exec_command" displays the output in the console.
     */
    const commandOutput = yield exports.execCommand(command);
    const stdout = commandOutput.stdout;
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
    const deploymentUrl = (_a = stdout.match(/https?:\/\/[^ ]+.vercel.app/gi)) === null || _a === void 0 ? void 0 : _a.shift();
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
    const customDeploymentFile = ((_c = (_b = stdout.match(/--local-config=.[^$]+?.json/gs)) === null || _b === void 0 ? void 0 : _b.shift()) === null || _c === void 0 ? void 0 : _c.split('=').find((el) => el.endsWith('.json'))) || config_1.VERCEL_CONFIG_FILE;
    core.debug(`Command: ${command}`);
    core.debug(`Custom deploy file: ${customDeploymentFile}`);
    if (deploymentUrl) {
        const deploymentDomain = deploymentUrl.replace('https://', '');
        core.debug(`Found url deployment. Exporting it...`);
        core.debug(`VERCEL_DEPLOYMENT_URL=${deploymentUrl}`);
        core.exportVariable('VERCEL_DEPLOYMENT_URL', deploymentUrl);
        core.setOutput('VERCEL_DEPLOYMENT_URL', deploymentUrl);
        core.debug(`VERCEL_DEPLOYMENT_DOMAIN=${deploymentDomain}`);
        core.exportVariable('VERCEL_DEPLOYMENT_DOMAIN', deploymentDomain);
        core.setOutput('VERCEL_DEPLOYMENT_DOMAIN', deploymentDomain);
        if (applyDomainAliases || extraAliases) {
            yield createAliases(deploymentUrl, customDeploymentFile, failIfAliasNotLinked, extraAliases);
        }
    }
    else {
        core.setFailed(`"Error during command execution, cannot find any url matching (using a regex to retrieve a url as "https://*.vercel.app"`);
    }
});
exports.default = deploy;
