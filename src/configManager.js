"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendConfigForm = exports.registerConfigOverride = exports.ConfigOverrideResult = exports.CONFIG = void 0;
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
const CONFIG_PATH = __dirname + '\\..\\config.json';
const configOverrides = new Map(); // Key: permission.key Value: Permission value
var ConfigOverrideResult;
(function (ConfigOverrideResult) {
    ConfigOverrideResult[ConfigOverrideResult["Success"] = 0] = "Success";
    ConfigOverrideResult[ConfigOverrideResult["InvalidKey"] = 1] = "InvalidKey";
    ConfigOverrideResult[ConfigOverrideResult["OverlappingOverride"] = 2] = "OverlappingOverride";
})(ConfigOverrideResult = exports.ConfigOverrideResult || (exports.ConfigOverrideResult = {}));
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
        // TODO: Implement recursive object comparison
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
        const updatedConfig = createUpdatedObjectIfKeysIfNotEqual(exports.CONFIG, defaultConfig);
        if (updatedConfig !== undefined) {
            exports.CONFIG = updatedConfig;
            (0, fs_1.writeFileSync)(CONFIG_PATH, JSON.stringify(exports.CONFIG, null, 4));
        }
    }
    else {
        exports.CONFIG = createDefaultConfig();
        (0, fs_1.writeFileSync)(CONFIG_PATH, JSON.stringify(exports.CONFIG, null, 4));
    }
    // Handle config overrides
    for (const [permissionKey, value] of configOverrides.entries()) {
        setValueAtPermissionKey(permissionKey, value);
    }
});
function setValueAtPermissionKey(permissionKey, value) {
    const keys = permissionKey.split(".");
    exports.CONFIG = setValueInConfig(exports.CONFIG, keys, value);
}
function setValueInConfig(config, keys, value) {
    const key = keys.shift();
    if (!key) {
        // Reached the final key, set the value
        return value;
    }
    // Check if the key exists in the config
    if (key in config) {
        // If the current key exists, recursively traverse deeper into the object
        config[key] = setValueInConfig(config[key], keys, value);
    }
    else {
        throw new Error(`Invalid key: ${key}`);
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
                    deleteClaimCommandEnabled: true,
                    cancelClaimCreationCommandEnabled: true,
                    giveWandCommandEnabled: true,
                    addPlayerCommandEnabled: true,
                    removePlayerCommandEnabled: true,
                    setClaimNameCommandEnabled: true,
                    managedMergedClaimsCommandEnabled: true,
                }
            },
            fclaim: {
                isEnabled: true,
                commandName: "fclaim",
                aliases: [],
                quickFormEnabled: true,
                subcommandOptions: {
                    addMaxToPlayerCommandEnabled: true,
                    removeMaxFromPlayerCommandEnabled: true,
                    checkPlayerBlocksCommandEnabled: true,
                    serverClaimCreationModeToggleCommandEnabled: true
                }
            },
            playtime: {
                isEnabled: true,
                commandName: "playtime",
                aliases: ["pt"],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbmZpZ01hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkJBQStDO0FBQy9DLHdDQUFtQztBQUNuQyxJQUFPLFVBQVUsR0FBRyxlQUFNLENBQUMsVUFBVSxDQUFDO0FBRXRDLHdDQUEyRTtBQUMzRSxzQ0FBaUM7QUFDakMsSUFBTyxTQUFTLEdBQUcsYUFBSyxDQUFDLFNBQVMsQ0FBQztBQUNuQyxrRUFBbUY7QUFFbkYsb0RBQXlEO0FBQ3pELGdEQUFxRDtBQUNyRCxzQ0FBa0M7QUFFbEMsTUFBTSxXQUFXLEdBQUcsU0FBUyxHQUFHLG1CQUFtQixDQUFDO0FBcUZwRCxNQUFNLGVBQWUsR0FBcUIsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLDhDQUE4QztBQUVuRyxJQUFZLG9CQUlYO0FBSkQsV0FBWSxvQkFBb0I7SUFDNUIscUVBQU8sQ0FBQTtJQUNQLDJFQUFVLENBQUE7SUFDViw2RkFBbUIsQ0FBQTtBQUN2QixDQUFDLEVBSlcsb0JBQW9CLEdBQXBCLDRCQUFvQixLQUFwQiw0QkFBb0IsUUFJL0I7QUFFRCxTQUFnQixzQkFBc0IsQ0FBQyxhQUFxQixFQUFFLFdBQWdCO0lBQzFFLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFMUMsSUFBSSxhQUFhLEdBQVEsbUJBQW1CLEVBQUUsQ0FBQztJQUMvQyxJQUFJLGdCQUFnQixHQUFRLFNBQVMsQ0FBQztJQUN0QyxLQUFLLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQzNDLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRTtZQUNiLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN6QzthQUFNO1lBQ0gsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7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