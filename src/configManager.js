"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendConfigForm = exports.CONFIG = void 0;
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
event_1.events.serverOpen.on(() => {
    (0, dllManager_1.updateConfigInNative)(dllTypes_1.NativeConfigObject.uglyConstruct());
});
function createUpdatedObjectIfKeysIfNotEqual(obj, exampleObj) {
    // Goal: Should return an OBJ that A.) Adds missing keys from exampleObj and B.) Removes keys not in exampleObj
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbmZpZ01hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkJBQStDO0FBQy9DLHdDQUFtQztBQUNuQyxJQUFPLFVBQVUsR0FBRyxlQUFNLENBQUMsVUFBVSxDQUFDO0FBRXRDLHdDQUEyRTtBQUMzRSxzQ0FBaUM7QUFDakMsSUFBTyxTQUFTLEdBQUcsYUFBSyxDQUFDLFNBQVMsQ0FBQztBQUNuQyxrRUFBbUY7QUFFbkYsb0RBQXlEO0FBQ3pELGdEQUFxRDtBQUNyRCxzQ0FBa0M7QUFFbEMsTUFBTSxXQUFXLEdBQUcsU0FBUyxHQUFHLG1CQUFtQixDQUFDO0FBbUZwRCxJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRTtJQUN6QixjQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFBLGlCQUFZLEVBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFeEQsTUFBTSxhQUFhLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQztJQUM1QyxNQUFNLGFBQWEsR0FBRyxtQ0FBbUMsQ0FBQyxjQUFNLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFFakYsSUFBSSxhQUFhLEtBQUssU0FBUyxFQUFFO1FBQzdCLGNBQU0sR0FBRyxhQUFhLENBQUM7UUFDdkIsSUFBQSxrQkFBYSxFQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMvRDtDQUNKO0tBQU07SUFDSCxjQUFNLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQztJQUUvQixJQUFBLGtCQUFhLEVBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQy9EO0FBRUQsY0FBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFO0lBQ3RC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