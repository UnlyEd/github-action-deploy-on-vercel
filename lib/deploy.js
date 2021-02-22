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
const core = __importStar(require("@actions/core"));
const fs_1 = __importDefault(require("fs"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const config_1 = require("./config");
const exec = require('@actions/exec');
const glob = require('@actions/glob');
const exec_command = (command) => __awaiter(void 0, void 0, void 0, function* () {
    let stdout = '';
    let stderr = '';
    const options = {};
    options.listeners = {
        stdout: (data) => {
            stdout += data.toString();
        },
        stderr: (data) => {
            stderr += data.toString();
        }
    };
    options.env = {
        "VERCEL_TOKEN": "process.env.VERCEL_TOKEN"
    };
    yield exec.exec('npx -v');
    yield exec.exec('yarn global add npx');
    yield exec.exec('npx -v');
    yield exec.exec('git version');
    yield exec.exec(command, [], options);
    console.log(stdout, stderr);
    console.log("Stdout: ", stdout);
    console.log("Stderr: ", stderr);
    return stdout;
});
const deploy = (command, deployAlias) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const stdout = yield exec_command(command);
    const deploymentUrl = (_a = stdout.match(/https?:\/\/[^ ]+.vercel.app/gi)) === null || _a === void 0 ? void 0 : _a.shift();
    const customDeploymentFile = (_c = (_b = command.match(/--local-config=([^,]+).json/g)) === null || _b === void 0 ? void 0 : _b.shift()) === null || _c === void 0 ? void 0 : _c.split("=").find(el => el.endsWith(".json"));
    if (deploymentUrl) {
        core.debug(`Found url deployment: ${deploymentUrl}. Exporting it...`);
        core.exportVariable("deploymentUrl", deploymentUrl);
        core.setOutput("deploymentUrl", deploymentUrl);
        if (deployAlias) {
            core.debug(`Starting to link aliases`);
            const globber = yield glob.create(customDeploymentFile);
            const vercelConfigFile = (yield globber.glob())[0] || config_1.VERCEL_CONFIG_FILE;
            if (vercelConfigFile && fs_1.default.existsSync(vercelConfigFile)) {
                core.debug(`Found custom config file: ${vercelConfigFile}`);
                core.debug(`Found real path: ${vercelConfigFile}`);
                const vercelConfig = JSON.parse(fs_1.default.readFileSync(vercelConfigFile, 'utf8'));
                const { id, ownerId } = (yield node_fetch_1.default(`https://api.vercel.com/v11/now/deployments/get?url=${deploymentUrl.replace("https://", "")}`, {
                    headers: {
                        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`
                    },
                    method: 'GET'
                }).then(data => data.json()));
                let aliasCreationPromises = [];
                for (const alias of vercelConfig.alias) {
                    console.log(`Creating alias ${alias}`);
                    aliasCreationPromises.push(node_fetch_1.default(`https://api.vercel.com/v2/now/deployments/${id}/aliases?teamId=${ownerId}`, {
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
                core.debug(Object(yield Promise.all(aliasCreationPromises)));
            }
            else {
                core.setFailed(`Cannot access to vercel config file "${vercelConfigFile}". Deployment succeeded but no aliases has been created.`);
            }
        }
    }
    else {
        core.setFailed(`"Error during command execution, cannot find any url matching (using a regex to retrieve a url as "https://*.vercel.app"`);
    }
});
exports.default = deploy;
