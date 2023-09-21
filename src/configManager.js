"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendConfigForm = exports.registerConfigOverride = exports.registerConfigDefaultOverride = exports.ConfigOverrideResult = exports.CONFIG = void 0;
const fs_1 = require("fs");
const fsutil_1 = require("bdsx/fsutil");
var isFileSync = fsutil_1.fsutil.isFileSync;
const form_1 = require("bdsx/bds/form");
const decay_1 = require("bdsx/decay");
var isDecayed = decay_1.decay.isDecayed;
const claimsBlockPayout_1 = require("./claims/claimsBlockPayout");
const dllManager_1 = require("./Native/dllManager");
const dllTypes_1 = require("./Native/dllTypes");
const event_1 = require("bdsx/event");
const eventStorage_1 = require("./events/eventStorage");
const onLoadedEvent_1 = require("./events/onLoadedEvent");
const CONFIG_PATH = __dirname + '\\..\\config.json';
function createClaimPilotConfigDefault() {
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
    };
}
const configOverrides = new Map(); // Key: permission.key Value: Permission value
const configDefaultOverrides = new Map(); // Key: permission.key Value: Permission Default Value
var ConfigOverrideResult;
(function (ConfigOverrideResult) {
    ConfigOverrideResult[ConfigOverrideResult["Success"] = 0] = "Success";
    ConfigOverrideResult[ConfigOverrideResult["InvalidKey"] = 1] = "InvalidKey";
    ConfigOverrideResult[ConfigOverrideResult["OverlappingOverride"] = 2] = "OverlappingOverride";
})(ConfigOverrideResult = exports.ConfigOverrideResult || (exports.ConfigOverrideResult = {}));
function registerConfigDefaultOverride(permissionKey, defaultValue) {
    configDefaultOverrides.set(permissionKey, defaultValue);
}
exports.registerConfigDefaultOverride = registerConfigDefaultOverride;
function registerConfigOverride(permissionKey, forcedValue) {
    const keyChain = permissionKey.split(".");
    let defaultConfig = createDefaultConfig();
    let lastCheckedValue = undefined;
    for (const [index, key] of keyChain.entries()) {
        if (index === 0) {
            lastCheckedValue = defaultConfig[key];
        }
        else {
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
    }
    else {
        configOverrides.set(permissionKey, forcedValue);
    }
    return ConfigOverrideResult.Success;
}
exports.registerConfigOverride = registerConfigOverride;
event_1.events.serverLoading.on(() => {
    if (isFileSync(CONFIG_PATH)) {
        exports.CONFIG = JSON.parse((0, fs_1.readFileSync)(CONFIG_PATH, 'utf-8'));
        const defaultConfig = createDefaultConfig();
        let updatedConfig = createUpdatedObjectIfKeysIfNotEqual(exports.CONFIG, defaultConfig);
        if (updatedConfig !== undefined) {
            exports.CONFIG = updatedConfig;
        }
    }
    else {
        exports.CONFIG = createDefaultConfig();
    }
    const writingConfig = createConfigForWrite(exports.CONFIG);
    (0, fs_1.writeFileSync)(CONFIG_PATH, JSON.stringify(writingConfig, null, 4));
    exports.CONFIG = checkAndUpdateConfig(exports.CONFIG);
    (0, eventStorage_1.fireEvent)(onLoadedEvent_1.ClaimPilotLoadedEvent.ID, undefined);
});
function setValueInConfig(config, keys, value) {
    const key = keys.shift();
    if (!key) {
        return value;
    }
    if (key in config) {
        config[key] = setValueInConfig(config[key], keys, value);
    }
    else {
        throw new Error(`Invalid key: ${key}`.red);
    }
    return config;
}
event_1.events.serverOpen.on(() => {
    (0, dllManager_1.updateConfigInNative)(dllTypes_1.NativeConfigObject.uglyConstruct());
});
function createUpdatedObjectIfKeysIfNotEqual(obj, exampleObj) {
    // Goal: Should return an OBJ that A. Adds missing keys from exampleObj and B. Removes keys not in exampleObj
    // NOTE: This will not validate types of params, just that they exist.
    const newObject = {};
    const exampleObjKeys = Object.keys(exampleObj);
    let hadToBeUpdated = false;
    for (const key of exampleObjKeys) {
        const objVal = obj[key];
        const exampleObjVal = exampleObj[key];
        if (objVal === undefined) {
            hadToBeUpdated = true;
            newObject[key] = exampleObjVal;
        }
        else if (typeof exampleObjVal === "object") {
            const res = createUpdatedObjectIfKeysIfNotEqual(objVal, exampleObjVal);
            if (res === undefined) {
                newObject[key] = objVal;
            }
            else {
                newObject[key] = res;
                hadToBeUpdated = true;
            }
        }
        else {
            newObject[key] = objVal;
        }
    }
    if (!hadToBeUpdated) {
        return undefined;
    }
    return newObject;
}
function createDefaultConfig() {
    let defaultConfig = createClaimPilotConfigDefault();
    for (const [key, override] of configDefaultOverrides) {
        const keyChain = key.split(".");
        setValueInConfig(defaultConfig, keyChain, override);
    }
    defaultConfig = checkAndUpdateConfig(defaultConfig);
    return defaultConfig;
}
function checkAndUpdateConfig(config, defaultConfig, currentKeyChain) {
    if (defaultConfig === undefined) {
        defaultConfig = createClaimPilotConfigDefault();
    }
    const keys = Object.keys(config);
    for (const key of keys) {
        let newKeyChain;
        if (currentKeyChain === undefined) {
            newKeyChain = key;
        }
        else {
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
        }
        else if (!(existingValue instanceof Array) && typeof existingValue === "object") {
            config[key] = checkAndUpdateConfig(existingValue, defaultValue, newKeyChain);
        }
    }
    return config;
}
function sendConfigForm(player) {
    const form = new form_1.CustomForm('Quick Config Editor', [
        new form_1.FormInput('Enter Wand Item ID', exports.CONFIG.wandItemId, exports.CONFIG.wandItemId),
        new form_1.FormInput('Enter Visualiser Particle ID', exports.CONFIG.visualiseParticle, exports.CONFIG.visualiseParticle),
        new form_1.FormLabel('Visualiser Enabled:'),
        new form_1.FormToggle('', exports.CONFIG.visualiserEnabled),
        new form_1.FormInput('Enter Visualiser Line Density', exports.CONFIG.visualiserLineDensity.toString(), exports.CONFIG.visualiserLineDensity.toString()),
        new form_1.FormInput('Enter Claim Minimum Width', exports.CONFIG.claimMinimumWidth.toString(), exports.CONFIG.claimMinimumWidth.toString()),
        new form_1.FormInput('Enter Claim Minimum Length', exports.CONFIG.claimMinimumLength.toString(), exports.CONFIG.claimMinimumLength.toString()),
        new form_1.FormInput('Enter Claim Minimum Height', exports.CONFIG.claimMinimumHeight.toString(), exports.CONFIG.claimMinimumHeight.toString()),
        new form_1.FormInput('Enter Claim Minimum Blocks', exports.CONFIG.claimMinimumBlocks.toString(), exports.CONFIG.claimMinimumBlocks.toString()),
        new form_1.FormLabel('Claims in Overworld Allowed:'),
        new form_1.FormToggle('', exports.CONFIG.allowedClaimDimension.Overworld),
        new form_1.FormLabel('Claims in Nether Allowed:'),
        new form_1.FormToggle('', exports.CONFIG.allowedClaimDimension.Nether),
        new form_1.FormLabel('Claims in The End Allowed:'),
        new form_1.FormToggle('', exports.CONFIG.allowedClaimDimension.End),
        new form_1.FormLabel('Explosions disabled in claims:'),
        new form_1.FormToggle('', exports.CONFIG.claimDisableExplosions),
        new form_1.FormInput('Enter Block Payout Interval', exports.CONFIG.blockPayoutInterval.toString(), exports.CONFIG.blockPayoutInterval.toString()),
        new form_1.FormInput('Enter Block Payout Reward', exports.CONFIG.blockRewardAmount.toString(), exports.CONFIG.blockRewardAmount.toString()),
        new form_1.FormLabel('Playtime Block Reward Enabled:'),
        new form_1.FormToggle('', exports.CONFIG.playtimeBlockRewardEnabled), // 20
    ]);
    form.sendTo(player.getNetworkIdentifier(), (res) => {
        if (res.response === null || isDecayed(player)) {
            return;
        }
        exports.CONFIG.wandItemId = res.response[0];
        exports.CONFIG.visualiseParticle = res.response[1];
        exports.CONFIG.visualiserEnabled = res.response[3];
        const lineDensity = parseInt(res.response[4]);
        if (!isNaN(lineDensity)) {
            exports.CONFIG.visualiserLineDensity = lineDensity;
        }
        const minWidth = parseInt(res.response[5]);
        if (!isNaN(minWidth)) {
            exports.CONFIG.claimMinimumWidth = minWidth;
        }
        const minLength = parseInt(res.response[6]);
        if (!isNaN(minLength)) {
            exports.CONFIG.claimMinimumLength = minLength;
        }
        const minHeight = parseInt(res.response[7]);
        if (!isNaN(minHeight)) {
            exports.CONFIG.claimMinimumHeight = minHeight;
        }
        const minBlocks = parseInt(res.response[8]);
        if (!isNaN(minBlocks)) {
            exports.CONFIG.claimMinimumBlocks = minBlocks;
        }
        exports.CONFIG.allowedClaimDimension.Overworld = res.response[10];
        exports.CONFIG.allowedClaimDimension.Nether = res.response[12];
        exports.CONFIG.allowedClaimDimension.End = res.response[14];
        exports.CONFIG.claimDisableExplosions = res.response[16];
        let newBlockPayoutInterval = parseInt(res.response[17]);
        let newBlockRewardAmount = parseInt(res.response[18]);
        let oldBlockRewardAmount = exports.CONFIG.blockRewardAmount;
        let oldBlockPayoutInterval = exports.CONFIG.blockPayoutInterval;
        if (isNaN(newBlockRewardAmount)) {
            newBlockRewardAmount = oldBlockRewardAmount;
        }
        if (isNaN(newBlockPayoutInterval)) {
            newBlockPayoutInterval = oldBlockPayoutInterval;
        }
        if (newBlockPayoutInterval !== oldBlockPayoutInterval || newBlockRewardAmount !== oldBlockRewardAmount) {
            (0, claimsBlockPayout_1.updateAllPlayerBlocksBasedOnNewSettings)(oldBlockRewardAmount, oldBlockRewardAmount);
        }
        exports.CONFIG.blockRewardAmount = newBlockRewardAmount;
        exports.CONFIG.blockPayoutInterval = newBlockPayoutInterval;
        exports.CONFIG.playtimeBlockRewardEnabled = res.response[20];
        (0, fs_1.writeFileSync)(CONFIG_PATH, JSON.stringify(exports.CONFIG, null, 4));
        (0, dllManager_1.updateConfigInNative)(dllTypes_1.NativeConfigObject.uglyConstruct());
    });
}
exports.sendConfigForm = sendConfigForm;
function areObjectsEqual(objectOne, objectTwo) {
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
    if (objectOneType === "string" ||
        objectOneType === "number" ||
        objectOneType === "boolean") {
        return objectOne === objectTwo;
    }
    else if (isOOneArray) {
        return areArraysEqual(objectOne, objectTwo);
    }
    else if (objectOneType === "object") {
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
        return isEqual;
    }
    else if (objectOneType === "undefined") {
        return false;
    }
    else {
        throw `ERROR: Unsupported Type ${objectOneType}`.red;
    }
}
function areArraysEqual(arrayOne, arrayTwo) {
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
function createConfigForWrite(config, currentKeyChain) {
    let writeableConfig = {};
    const keys = Object.keys(config);
    for (const key of keys) {
        let newKeyChain;
        if (currentKeyChain === undefined) {
            newKeyChain = key;
        }
        else {
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
        }
        else {
            writeableConfig[key] = existingValue;
        }
    }
    return writeableConfig;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbmZpZ01hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkJBQStDO0FBQy9DLHdDQUFtQztBQUNuQyxJQUFPLFVBQVUsR0FBRyxlQUFNLENBQUMsVUFBVSxDQUFDO0FBRXRDLHdDQUEyRTtBQUMzRSxzQ0FBaUM7QUFDakMsSUFBTyxTQUFTLEdBQUcsYUFBSyxDQUFDLFNBQVMsQ0FBQztBQUNuQyxrRUFBbUY7QUFFbkYsb0RBQXlEO0FBQ3pELGdEQUFxRDtBQUNyRCxzQ0FBa0M7QUFDbEMsd0RBQWdEO0FBQ2hELDBEQUE2RDtBQUU3RCxNQUFNLFdBQVcsR0FBRyxTQUFTLEdBQUcsbUJBQW1CLENBQUM7QUFFcEQsU0FBUyw2QkFBNkI7SUFDbEMsT0FBTztRQUNILFlBQVksRUFBRSxHQUFHO1FBQ2pCLFVBQVUsRUFBRSxpQkFBaUI7UUFDN0IsaUJBQWlCLEVBQUUsZ0NBQWdDO1FBQ25ELGlCQUFpQixFQUFFLElBQUk7UUFDdkIscUJBQXFCLEVBQUUsRUFBRTtRQUN6QixhQUFhLEVBQUUsRUFBRTtRQUNqQixpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDckIsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RCLGtCQUFrQixFQUFFLENBQUMsQ0FBQztRQUN0QixrQkFBa0IsRUFBRSxFQUFFO1FBQ3RCLHNCQUFzQixFQUFFLElBQUk7UUFDNUIsb0JBQW9CLEVBQUUsR0FBRztRQUN6QixlQUFlLEVBQUUsR0FBRztRQUNwQixxQkFBcUIsRUFBRSxJQUFJO1FBQzNCLHFCQUFxQixFQUFFO1lBQ25CLFNBQVMsRUFBRSxJQUFJO1lBQ2YsTUFBTSxFQUFFLEtBQUs7WUFDYixHQUFHLEVBQUUsS0FBSztTQUNiO1FBQ0QsZ0JBQWdCLEVBQUUsS0FBSztRQUN2QixjQUFjLEVBQUUsS0FBSztRQUNyQixlQUFlLEVBQUUsSUFBSTtRQUNyQixxQkFBcUIsRUFBRSxJQUFJO1FB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