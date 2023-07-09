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
    let lastReadValue = undefined;
    const keyPath = permissionKey.split(".");
    for (const [index, key] of keyPath.entries()) {
        if (index === 0) {
            lastReadValue = exports.CONFIG[key];
        }
        else {
            lastReadValue = lastReadValue[key];
        }
        if (lastReadValue === undefined) {
            throw `INVALID KEY AT ${key}`;
        }
        if (index === (keyPath.length - 1)) {
            exports.CONFIG[key] = value;
        }
    }
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