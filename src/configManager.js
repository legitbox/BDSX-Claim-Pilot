"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendConfigForm = exports.CONFIG = void 0;
const fs_1 = require("fs");
const fsutil_1 = require("bdsx/fsutil");
var isFileSync = fsutil_1.fsutil.isFileSync;
const form_1 = require("bdsx/bds/form");
const decay_1 = require("bdsx/decay");
var isDecayed = decay_1.decay.isDecayed;
const CONFIG_PATH = __dirname + '\\..\\config.json';
if (isFileSync(CONFIG_PATH)) {
    exports.CONFIG = JSON.parse((0, fs_1.readFileSync)(CONFIG_PATH, 'utf-8'));
}
else {
    exports.CONFIG = createDefaultConfig();
    (0, fs_1.writeFileSync)(CONFIG_PATH, JSON.stringify(exports.CONFIG, null, 4));
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
        wandName: "Claim Wand",
        wandLore: [
            "Select two corners to create a new claim!",
        ],
        playtimeUpdateInterval: 4000,
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
                    giveWandCommandEnabled: true
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
        new form_1.FormToggle('', exports.CONFIG.claimDisableExplosions), // 16
    ]);
    form.sendTo(player.getNetworkIdentifier(), (res) => {
        if (res.response === null || isDecayed(player)) {
            return;
        }
        exports.CONFIG.wandItemId = res.response[0];
        exports.CONFIG.visualiseParticle = res.response[1];
        exports.CONFIG.visualiserEnabled = res.response[3];
        exports.CONFIG.visualiserLineDensity = res.response[4];
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
        (0, fs_1.writeFileSync)(CONFIG_PATH, JSON.stringify(exports.CONFIG, null, 4));
    });
}
exports.sendConfigForm = sendConfigForm;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbmZpZ01hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkJBQStDO0FBQy9DLHdDQUFtQztBQUNuQyxJQUFPLFVBQVUsR0FBRyxlQUFNLENBQUMsVUFBVSxDQUFDO0FBRXRDLHdDQUEyRTtBQUMzRSxzQ0FBaUM7QUFDakMsSUFBTyxTQUFTLEdBQUcsYUFBSyxDQUFDLFNBQVMsQ0FBQztBQUVuQyxNQUFNLFdBQVcsR0FBRyxTQUFTLEdBQUcsbUJBQW1CLENBQUM7QUErRXBELElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFO0lBQ3pCLGNBQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUEsaUJBQVksRUFBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztDQUMzRDtLQUFNO0lBQ0gsY0FBTSxHQUFHLG1CQUFtQixFQUFFLENBQUM7SUFFL0IsSUFBQSxrQkFBYSxFQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUMvRDtBQUVELFNBQVMsbUJBQW1CO0lBQ3hCLE9BQU87UUFDSCxZQUFZLEVBQUUsR0FBRztRQUNqQixVQUFVLEVBQUUsaUJBQWlCO1FBQzdCLGlCQUFpQixFQUFFLGdDQUFnQztRQUNuRCxpQkFBaUIsRUFBRSxJQUFJO1FBQ3ZCLHFCQUFxQixFQUFFLEVBQUU7UUFDekIsYUFBYSxFQUFFLEVBQUU7UUFDakIsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBQ3JCLGtCQUFrQixFQUFFLENBQUMsQ0FBQztRQUN0QixrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFDdEIsa0JBQWtCLEVBQUUsRUFBRTtRQUN0QixzQkFBc0IsRUFBRSxJQUFJO1FBQzVCLG9CQUFvQixFQUFFLEdBQUc7UUFDekIsZUFBZSxFQUFFLEdBQUc7UUFDcEIscUJBQXFCLEVB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