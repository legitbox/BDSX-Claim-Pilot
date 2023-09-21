import {readFileSync, writeFileSync} from "fs";
import {fsutil} from "bdsx/fsutil";
import isFileSync = fsutil.isFileSync;
import {ServerPlayer} from "bdsx/bds/player";
import {CustomForm, FormInput, FormLabel, FormToggle} from "bdsx/bds/form";
import {decay} from "bdsx/decay";
import isDecayed = decay.isDecayed;
import {updateAllPlayerBlocksBasedOnNewSettings} from "./claims/claimsBlockPayout";
import {Config} from "bdsx/config";
import {updateConfigInNative} from "./Native/dllManager";
import {NativeConfigObject} from "./Native/dllTypes";
import {events} from "bdsx/event";
import {fireEvent} from "./events/eventStorage";
import {ClaimPilotLoadedEvent} from "./events/onLoadedEvent";

const CONFIG_PATH = __dirname + '\\..\\config.json';

function createClaimPilotConfigDefault(): Config {
    return {
        wandFireRate: 500,
        wandItemId: 'minecraft:stick',
        visualiseParticle: 'minecraft:balloon_gas_particle',
        visualiserEnabled: true,
        visualiserLineDensity: 10,
        claimIdLength: 16,
        claimMinimumWidth: -1,
        claimMinimumLength: -1,
        claimMinimumHeight: -1,
        claimMinimumBlocks: 27,
        claimDisableExplosions: true,
        visualizerUpdateRate: 500,
        claimUpdateRate: 250,
        defaultMaxClaimBlocks: 4096,
        allowedClaimDimension: {
            Overworld: true,
            Nether: false,
            End: false
        },
        giveWandCooldown: 60000,
        wandNbtEnabled: false,
        wandNameEnabled: true,
        wandTestByNameEnabled: true,
        wandLoreEnabled: true,
        wandTestByLoreEnabled: true,
        wandName: "Claim Wand",
        wandLore: [
            "Select two corners to create a new claim!",
        ],
        playtimeUpdateInterval: 4000,
        playtimeBlockRewardEnabled: true,
        blockPayoutInterval: 3600000,
        blockRewardAmount: 125,
        commandOptions: {
            claim: {
                isEnabled: true,
                commandName: "claim",
                aliases: [],
                quickFormEnabled: true,
                subcommandOptions: {
                    checkBlocksCommandEnabled: true,
                    cancelClaimCreationCommandEnabled: true,
                    giveWandCommandEnabled: true,
                    editClaimCommandEnabled: true,
                }
            },
            fclaim: {
                isEnabled: true,
                commandName: "fclaim",
                aliases: [],
                quickFormEnabled: true,
                subcommandOptions: {
                    editPlayerBlocksCommandEnabled: true,
                    serverClaimCreationModeToggleCommandEnabled: true,
                    fixPlayerBlocksCommandEnabled: true,
                }
            },
            playtime: {
                isEnabled: true,
                commandName: "playtime",
                aliases: ["pt"],
                quickFormEnabled: true,
                subcommandOptions: {
                    checkPlaytimeCommandEnabled: true,
                    checkOtherPlayerPlaytimeCommandEnabled: true
                }
            },
            config: {
                isEnabled: true,
                commandName: "config",
                aliases: [],
                subcommandOptions: {
                    editQuickConfigCommandEnabled: true
                }
            }
        }
    }
}

export interface Config {
    wandFireRate: number;
    wandItemId: string;
    visualiseParticle: string;
    visualiserEnabled: boolean;
    visualiserLineDensity: number;
    claimIdLength: number;
    claimMinimumWidth: number;
    claimMinimumLength: number;
    claimMinimumHeight: number;
    claimMinimumBlocks: number;
    claimDisableExplosions: boolean;
    visualizerUpdateRate: number;
    claimUpdateRate: number;
    defaultMaxClaimBlocks: number;
    allowedClaimDimension: {
        Overworld: boolean,
        Nether: boolean,
        End: boolean,
    };
    giveWandCooldown: number;
    wandNbtEnabled: boolean;
    wandNameEnabled: boolean;
    wandTestByNameEnabled: boolean;
    wandLoreEnabled: boolean;
    wandTestByLoreEnabled: boolean;
    wandName: string;
    wandLore: string[];
    playtimeUpdateInterval: number;
    playtimeBlockRewardEnabled: boolean;
    blockPayoutInterval: number;
    blockRewardAmount: number;
    commandOptions: {
        claim: {
            isEnabled: boolean;
            commandName: string;
            aliases: string[];
            quickFormEnabled: boolean;
            subcommandOptions: {
                checkBlocksCommandEnabled: boolean;
                cancelClaimCreationCommandEnabled: boolean;
                giveWandCommandEnabled: boolean;
                editClaimCommandEnabled: boolean;
            }
        };
        fclaim: {
            isEnabled: boolean;
            commandName: string;
            aliases: string[];
            quickFormEnabled: boolean;
            subcommandOptions: {
                editPlayerBlocksCommandEnabled: boolean;
                serverClaimCreationModeToggleCommandEnabled: boolean;
                fixPlayerBlocksCommandEnabled: boolean;
            }
        }
        playtime: {
            isEnabled: boolean,
            commandName: string,
            aliases: string[],
            quickFormEnabled: boolean,
            subcommandOptions: {
                checkPlaytimeCommandEnabled: boolean,
                checkOtherPlayerPlaytimeCommandEnabled: boolean,
            }
        }
        config: {
            isEnabled: boolean;
            commandName: string;
            aliases: string[];
            subcommandOptions: {
                editQuickConfigCommandEnabled: boolean;
            }
        }
    }
}

export let CONFIG: Config;

const configOverrides: Map<string, any> = new Map(); // Key: permission.key Value: Permission value
const configDefaultOverrides: Map<string, any> = new Map(); // Key: permission.key Value: Permission Default Value

export enum ConfigOverrideResult {
    Success,
    InvalidKey,
    OverlappingOverride,
}

export function registerConfigDefaultOverride(permissionKey: string, defaultValue: any) {
    configDefaultOverrides.set(permissionKey, defaultValue);
}

export function registerConfigOverride(permissionKey: string, forcedValue: any) {
    const keyChain = permissionKey.split(".");

    let defaultConfig: any = createDefaultConfig();
    let lastCheckedValue: any = undefined;
    for (const [index, key] of keyChain.entries()) {
        if (index === 0) {
            lastCheckedValue = defaultConfig[key];
        } else {
            lastCheckedValue = lastCheckedValue[key];
        }

        if (lastCheckedValue === undefined) {
            return ConfigOverrideResult.InvalidKey;
        }
    }

    const existingOverride = configOverrides.get(permissionKey);
    if (existingOverride !== undefined) {
        if (forcedValue !== existingOverride) {
            return ConfigOverrideResult.OverlappingOverride;
        }
    } else {
        configOverrides.set(permissionKey, forcedValue);
    }

    return ConfigOverrideResult.Success
}

events.serverLoading.on(() => {
    if (isFileSync(CONFIG_PATH)) {
        CONFIG = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));

        const defaultConfig = createDefaultConfig();
        let updatedConfig = createUpdatedObjectIfKeysIfNotEqual(CONFIG, defaultConfig);

        if (updatedConfig !== undefined) {
            CONFIG = updatedConfig;
        }
    } else {
        CONFIG = createDefaultConfig();
    }

    const writingConfig = createConfigForWrite(CONFIG);
    writeFileSync(CONFIG_PATH, JSON.stringify(writingConfig, null, 4));

    CONFIG = checkAndUpdateConfig(CONFIG);

    fireEvent(ClaimPilotLoadedEvent.ID, undefined);
})

function setValueInConfig(config: any, keys: string[], value: any): Config {
    const key = keys.shift();

    if (!key) {
        return value;
    }

    if (key in config) {
        config[key] = setValueInConfig(config[key], keys, value);
    } else {
        throw new Error(`Invalid key: ${key}`.red);
    }

    return config;
}

events.serverOpen.on(() => {
    updateConfigInNative(NativeConfigObject.uglyConstruct());
})

function createUpdatedObjectIfKeysIfNotEqual(obj: any, exampleObj: any) {
    // Goal: Should return an OBJ that A. Adds missing keys from exampleObj and B. Removes keys not in exampleObj
    // NOTE: This will not validate types of params, just that they exist.
    const newObject: any = {}

    const exampleObjKeys = Object.keys(exampleObj);

    let hadToBeUpdated = false;
    for (const key of exampleObjKeys) {
        const objVal = obj[key];
        const exampleObjVal = exampleObj[key];

        if (objVal === undefined) {
            hadToBeUpdated = true;
            newObject[key] = exampleObjVal;
        } else if (typeof exampleObjVal === "object") {
            const res = createUpdatedObjectIfKeysIfNotEqual(objVal, exampleObjVal);
            if (res === undefined) {
                newObject[key] = objVal;
            } else {
                newObject[key] = res;
                hadToBeUpdated = true;
            }
        } else {
            newObject[key] = objVal;
        }
    }

    if (!hadToBeUpdated) {
        return undefined;
    }

    return newObject;
}

function createDefaultConfig(): Config {
    let defaultConfig: any = createClaimPilotConfigDefault();

    for (const [key, override] of configDefaultOverrides) {
        const keyChain = key.split(".");

        setValueInConfig(defaultConfig, keyChain, override);
    }

    defaultConfig = checkAndUpdateConfig(defaultConfig);

    return defaultConfig;
}

function checkAndUpdateConfig(config: any, defaultConfig?: any, currentKeyChain?: string) {
    if (defaultConfig === undefined) {
        defaultConfig = createClaimPilotConfigDefault();
    }

    const keys = Object.keys(config);
    for (const key of keys) {
        let newKeyChain;
        if (currentKeyChain === undefined) {
            newKeyChain = key;
        } else {
            newKeyChain = `${currentKeyChain}.${key}`;
        }

        const forcedOverriddenValue = configOverrides.get(newKeyChain);
        if (forcedOverriddenValue !== undefined) {
            config[key] = forcedOverriddenValue;
            continue;
        }

        const existingValue = config[key];
        const defaultValue = defaultConfig[key];

        const defaultOverriddenValue = configDefaultOverrides.get(newKeyChain);
        const isValueObject = typeof defaultValue === "object" && !(defaultValue instanceof Array);


        if (!areObjectsEqual(existingValue, defaultValue)) {
            if (!isValueObject) {
                continue;
            }

            if (defaultOverriddenValue !== undefined) {
                throw `ERROR: Cant Override Object Property In Config! Key: ${newKeyChain}`.red;
            }
        }

        if (defaultOverriddenValue !== undefined) {
            config[key] = defaultOverriddenValue;
        } else if (!(existingValue instanceof Array) && typeof existingValue === "object") {
            config[key] = checkAndUpdateConfig(existingValue, defaultValue, newKeyChain);
        }
    }

    return config;
}

export function sendConfigForm(player: ServerPlayer) {
    const form = new CustomForm('Quick Config Editor', [
        new FormInput('Enter Wand Item ID', CONFIG.wandItemId, CONFIG.wandItemId), // 0
        new FormInput('Enter Visualiser Particle ID', CONFIG.visualiseParticle, CONFIG.visualiseParticle), // 1
        new FormLabel('Visualiser Enabled:'),
        new FormToggle('', CONFIG.visualiserEnabled), // 3
        new FormInput('Enter Visualiser Line Density', CONFIG.visualiserLineDensity.toString(), CONFIG.visualiserLineDensity.toString()), // 4
        new FormInput('Enter Claim Minimum Width', CONFIG.claimMinimumWidth.toString(), CONFIG.claimMinimumWidth.toString()), // 5
        new FormInput('Enter Claim Minimum Length', CONFIG.claimMinimumLength.toString(), CONFIG.claimMinimumLength.toString()), // 6
        new FormInput('Enter Claim Minimum Height', CONFIG.claimMinimumHeight.toString(), CONFIG.claimMinimumHeight.toString()), // 7
        new FormInput('Enter Claim Minimum Blocks', CONFIG.claimMinimumBlocks.toString(), CONFIG.claimMinimumBlocks.toString()), // 8
        new FormLabel('Claims in Overworld Allowed:'),
        new FormToggle('', CONFIG.allowedClaimDimension.Overworld), // 10
        new FormLabel('Claims in Nether Allowed:'),
        new FormToggle('', CONFIG.allowedClaimDimension.Nether), // 12
        new FormLabel('Claims in The End Allowed:'),
        new FormToggle('', CONFIG.allowedClaimDimension.End), // 14
        new FormLabel('Explosions disabled in claims:'),
        new FormToggle('', CONFIG.claimDisableExplosions), // 16
        new FormInput('Enter Block Payout Interval', CONFIG.blockPayoutInterval.toString(), CONFIG.blockPayoutInterval.toString()), // 17
        new FormInput('Enter Block Payout Reward', CONFIG.blockRewardAmount.toString(), CONFIG.blockRewardAmount.toString()), // 18
        new FormLabel('Playtime Block Reward Enabled:'),
        new FormToggle('', CONFIG.playtimeBlockRewardEnabled), // 20
    ]);

    form.sendTo(player.getNetworkIdentifier(), (res) => {
        if (res.response === null || isDecayed(player)) {
            return;
        }

        CONFIG.wandItemId = res.response[0];
        CONFIG.visualiseParticle = res.response[1];
        CONFIG.visualiserEnabled = res.response[3];

        const lineDensity = parseInt(res.response[4]);
        if (!isNaN(lineDensity)) {
            CONFIG.visualiserLineDensity = lineDensity;
        }

        const minWidth = parseInt(res.response[5]);
        if (!isNaN(minWidth)) {
            CONFIG.claimMinimumWidth = minWidth;
        }

        const minLength = parseInt(res.response[6]);
        if (!isNaN(minLength)) {
            CONFIG.claimMinimumLength = minLength;
        }

        const minHeight = parseInt(res.response[7]);
        if (!isNaN(minHeight)) {
            CONFIG.claimMinimumHeight = minHeight;
        }

        const minBlocks = parseInt(res.response[8]);
        if (!isNaN(minBlocks)) {
            CONFIG.claimMinimumBlocks = minBlocks;
        }

        CONFIG.allowedClaimDimension.Overworld = res.response[10];
        CONFIG.allowedClaimDimension.Nether = res.response[12];
        CONFIG.allowedClaimDimension.End = res.response[14];
        CONFIG.claimDisableExplosions = res.response[16];

        let newBlockPayoutInterval = parseInt(res.response[17]);
        let newBlockRewardAmount = parseInt(res.response[18]);
        let oldBlockRewardAmount = CONFIG.blockRewardAmount;
        let oldBlockPayoutInterval = CONFIG.blockPayoutInterval;

        if (isNaN(newBlockRewardAmount)) {
            newBlockRewardAmount = oldBlockRewardAmount;
        }

        if (isNaN(newBlockPayoutInterval)) {
            newBlockPayoutInterval = oldBlockPayoutInterval;
        }

        if (newBlockPayoutInterval !== oldBlockPayoutInterval || newBlockRewardAmount !== oldBlockRewardAmount) {
            updateAllPlayerBlocksBasedOnNewSettings(oldBlockRewardAmount, oldBlockRewardAmount);
        }

        CONFIG.blockRewardAmount = newBlockRewardAmount;
        CONFIG.blockPayoutInterval = newBlockPayoutInterval;

        CONFIG.playtimeBlockRewardEnabled = res.response[20];

        writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG, null, 4));

        updateConfigInNative(NativeConfigObject.uglyConstruct());
    })
}

function areObjectsEqual(objectOne: any, objectTwo: any) {
    const objectOneType = typeof objectOne;
    const objectTwoType = typeof objectTwo;

    if (objectOneType !== objectTwoType) {
        return false;
    }

    const isOOneArray = objectOne instanceof Array;
    const isOTwoArray = objectTwo instanceof Array;

    if (isOOneArray !== isOTwoArray) {
        return false;
    }

    if (
        objectOneType === "string" ||
        objectOneType === "number" ||
        objectOneType === "boolean"
    ) {
        return objectOne === objectTwo;
    } else if (isOOneArray) {
        return areArraysEqual(objectOne, objectTwo);
    } else if (objectOneType === "object") {
        const oOneKeys = Object.keys(objectOne);
        const oTwoKeys = Object.keys(objectTwo);

        if (oOneKeys.length !== oTwoKeys.length || !areArraysEqual(oOneKeys, oTwoKeys)) {
            return false;
        }

        let isEqual = true;
        for (const key of oOneKeys) {
            const oOneValue = objectOne[key];
            const oTwoValue = objectTwo[key];

            const ret = areObjectsEqual(oOneValue, oTwoValue);
            if (!ret) {
                isEqual = false;
                break;
            }
        }

        return isEqual
    } else if (objectOneType === "undefined") {
        return false;
    } else {
        throw `ERROR: Unsupported Type ${objectOneType}`.red;
    }
}

function areArraysEqual(arrayOne: any[], arrayTwo: any[]) {
    if (arrayOne.length !== arrayTwo.length) {
        return false;
    }

    let isEqual = true;
    for (let i = 0; i < arrayOne.length; i++) {
        const arrayOneValue = arrayOne[i];
        const arrayTwoValue = arrayTwo[i];

        if (!areObjectsEqual(arrayOneValue, arrayTwoValue)) {
            isEqual = false;
            break;
        }
    }

    return isEqual;
}

function createConfigForWrite(config: any, currentKeyChain?: string) {
    let writeableConfig: any = {};

    const keys = Object.keys(config);
    for (const key of keys) {
        let newKeyChain;
        if (currentKeyChain === undefined) {
            newKeyChain = key;
        } else {
            newKeyChain = `${currentKeyChain}.${key}`;
        }

        const forcedOverride = configOverrides.get(newKeyChain);
        if (forcedOverride !== undefined) {
            continue;
        }

        const existingValue = config[key];
        const isObject = typeof existingValue === "object" && !(existingValue instanceof Array);

        if (isObject) {
            writeableConfig[key] = createConfigForWrite(existingValue, newKeyChain);
        } else {
            writeableConfig[key] = existingValue;
        }
    }

    return writeableConfig;
}