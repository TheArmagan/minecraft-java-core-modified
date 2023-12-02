/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import { CommonSpawnOptions, spawn } from 'child_process';

import jsonMinecraft from './Minecraft/Minecraft-Json.js';
import librariesMinecraft from './Minecraft/Minecraft-Libraries.js';
import assetsMinecraft from './Minecraft/Minecraft-Assets.js';
import loaderMinecraft from './Minecraft/Minecraft-Loader.js';
import javaMinecraft from './Minecraft/Minecraft-Java.js';
import bundleMinecraft from './Minecraft/Minecraft-Bundle.js';
import argumentsMinecraft from './Minecraft/Minecraft-Arguments.js';

import { isold as isOld } from './utils/Index.js';
import Downloader from './utils/Downloader.js';

type loader = {
    type?: string,
    build?: string,
    enable?: boolean
}

type screen = {
    width?: number,
    height?: number,
    fullscreen?: boolean
}

type memory = {
    min?: string,
    max?: string
}

type LaunchOPTS = {
    url: string | null,
    authenticator: any,
    timeout?: number,
    path: string,
    version: string,
    instance?: string,
    detached?: boolean,
    downloadFileMultiple?: number,
    intelEnabledMac?: boolean,
    loader: loader,
    mcp: any,
    verify: boolean,
    ignored: string[],
    JVM_ARGS: string[],
    GAME_ARGS: string[],
    javaPath: string,
    screen: screen,
    memory: memory
    spawnOptions: CommonSpawnOptions
};

export default class Launch extends EventEmitter {
    options: LaunchOPTS;

    constructor() {
        super();
    }

    async Launch(opt: LaunchOPTS) {
        const defaultOptions: LaunchOPTS = {
            url: null,
            authenticator: null,
            timeout: 60000,
            path: '.minecraft',
            version: 'latest_release',
            instance: null,
            detached: false,
            intelEnabledMac: false,
            downloadFileMultiple: 5,

            loader: {
                type: null,
                build: 'latest',
                enable: false,
            },

            mcp: null,

            verify: false,
            ignored: [],
            JVM_ARGS: [],
            GAME_ARGS: [],

            javaPath: null,

            screen: {
                width: null,
                height: null,
                fullscreen: false,
            },

            memory: {
                min: '1G',
                max: '2G'
            },

            spawnOptions: {},
            ...opt,
        };

        this.options = defaultOptions;
        this.options.path = path.resolve(this.options.path).replace(/\\/g, '/');

        if (this.options.mcp) {
            if (this.options.instance) this.options.mcp = `${this.options.path}/instances/${this.options.instance}/${this.options.mcp}`
            else this.options.mcp = path.resolve(`${this.options.path}/${this.options.mcp}`).replace(/\\/g, '/')
        }

        if (this.options.loader.type) {
            this.options.loader.type = this.options.loader.type.toLowerCase()
            this.options.loader.build = this.options.loader.build.toLowerCase()
        }

        if (!this.options.authenticator) return this.emit("error", { error: "Authenticator not found" });
        if (this.options.downloadFileMultiple < 1) this.options.downloadFileMultiple = 1
        if (this.options.downloadFileMultiple > 30) this.options.downloadFileMultiple = 30
        return this.start();
    }


    async start() {
        let data: any = await this.DownloadGame();
        if (data.error) return this.emit('error', data);
        let { minecraftJson, minecraftLoader, minecraftVersion, minecraftJava } = data;

        let minecraftArguments: any = await new argumentsMinecraft(this.options).GetArguments(minecraftJson, minecraftLoader);
        if (minecraftArguments.error) return this.emit('error', minecraftArguments);

        let loaderArguments: any = await new loaderMinecraft(this.options).GetArguments(minecraftLoader, minecraftVersion);
        if (loaderArguments.error) return this.emit('error', loaderArguments);

        let Arguments: any = [
            ...minecraftArguments.jvm,
            ...minecraftArguments.classpath,
            ...loaderArguments.jvm,
            minecraftArguments.mainClass,
            ...minecraftArguments.game,
            ...loaderArguments.game
        ]

        let java: any = this.options.javaPath ? this.options.javaPath : minecraftJava.path;
        let logs = this.options.instance ? `${this.options.path}/instances/${this.options.instance}` : this.options.path;
        if (!fs.existsSync(logs)) fs.mkdirSync(logs, { recursive: true });

        let argumentsLogs: string = Arguments.join(' ')
        argumentsLogs = argumentsLogs.replaceAll(this.options.authenticator.access_token, '????????')
        argumentsLogs = argumentsLogs.replaceAll(this.options.authenticator.client_token, '????????')
        argumentsLogs = argumentsLogs.replaceAll(this.options.authenticator.uuid, '????????')
        argumentsLogs = argumentsLogs.replaceAll(this.options.authenticator.xuid, '????????')
        argumentsLogs = argumentsLogs.replaceAll(`${this.options.path}/`, '')
        this.emit('data', `Launching with arguments ${argumentsLogs}`);

        let mcProc = spawn(java, Arguments, { cwd: logs, detached: this.options.detached, ...this.options.spawnOptions })
        mcProc.stdout.on('data', (data) => this.emit('data', data.toString('utf-8')))
        mcProc.stderr.on('data', (data) => this.emit('data', data.toString('utf-8')))
        mcProc.on('close', (code) => this.emit('close', 'Minecraft closed'));

        return mcProc;
    }

    async DownloadGame() {
        let InfoVersion = await new jsonMinecraft(this.options).GetInfoVersion();
        let loaderJson: any = null;
        if (InfoVersion.error) return InfoVersion
        let { json, version } = InfoVersion;

        let libraries = new librariesMinecraft(this.options)
        let bundle = new bundleMinecraft(this.options)

        let gameLibraries: any = await libraries.Getlibraries(json);
        let gameAssetsOther: any = await libraries.GetAssetsOthers(this.options.url);
        let gameAssets: any = await new assetsMinecraft(this.options).GetAssets(json);
        let gameJava: any = this.options.javaPath ? { files: [] } : await new javaMinecraft(this.options).GetJsonJava(json);

        if (gameJava.error) return gameJava

        let filesList: any = await bundle.checkBundle([...gameLibraries, ...gameAssetsOther, ...gameAssets, ...gameJava.files]);

        if (filesList.length > 0) {
            let downloader = new Downloader();
            let totsize = await bundle.getTotalSize(filesList);

            downloader.on("progress", (DL: any, totDL: any, element: any) => {
                this.emit("progress", DL, totDL, element);
            });

            downloader.on("speed", (speed: any) => {
                this.emit("speed", speed);
            });

            downloader.on("estimated", (time: any) => {
                this.emit("estimated", time);
            });

            downloader.on("error", (e: any) => {
                this.emit("error", e);
            });

            await downloader.downloadFileMultiple(filesList, totsize, this.options.downloadFileMultiple, this.options.timeout);
        }

        if (this.options.loader.enable === true) {
            let loaderInstall = new loaderMinecraft(this.options)

            loaderInstall.on('extract', (extract: any) => {
                this.emit('extract', extract);
            });

            loaderInstall.on('progress', (progress: any, size: any, element: any) => {
                this.emit('progress', progress, size, element);
            });

            loaderInstall.on('check', (progress: any, size: any, element: any) => {
                this.emit('check', progress, size, element);
            });

            loaderInstall.on('patch', (patch: any) => {
                this.emit('patch', patch);
            });

            let jsonLoader = await loaderInstall.GetLoader(version, this.options.javaPath ? this.options.javaPath : gameJava.path)
                .then((data: any) => data)
                .catch((err: any) => err);
            if (jsonLoader.error) return jsonLoader;
            loaderJson = jsonLoader;
        }

        if (this.options.verify) await bundle.checkFiles([...gameLibraries, ...gameAssetsOther, ...gameAssets, ...gameJava.files]);

        let natives = await libraries.natives(gameLibraries);
        if (natives.length === 0) json.nativesList = false;
        else json.nativesList = true;

        if (isOld(json)) new assetsMinecraft(this.options).copyAssets(json);

        return {
            minecraftJson: json,
            minecraftLoader: loaderJson,
            minecraftVersion: version,
            minecraftJava: gameJava
        }
    }
}