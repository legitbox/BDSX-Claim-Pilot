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
    const defaultInstance = createDefaultConfig();
    const defaultInstKeys = Object.keys(defaultInstance);
    const configKeys = Object.keys(exports.CONFIG);
    if (defaultInstKeys.length !== configKeys.length) {
        if (defaultInstKeys.length > configKeys.length) {
            for (const key of defaultInstKeys) {
                if (!configKeys.includes(key)) {
                    // @ts-ignore
                    exports.CONFIG[key] = defaultInstance[key];
                }
            }
        }
        else {
            for (const key of configKeys) {
                if (!defaultInstKeys.includes(key)) {
                    // @ts-ignore
                    exports.CONFIG[key] = undefined;
                }
            }
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbmZpZ01hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkJBQStDO0FBQy9DLHdDQUFtQztBQUNuQyxJQUFPLFVBQVUsR0FBRyxlQUFNLENBQUMsVUFBVSxDQUFDO0FBRXRDLHdDQUEyRTtBQUMzRSxzQ0FBaUM7QUFDakMsSUFBTyxTQUFTLEdBQUcsYUFBSyxDQUFDLFNBQVMsQ0FBQztBQUNuQyxrRUFBbUY7QUFFbkYsb0RBQXlEO0FBQ3pELGdEQUFxRDtBQUNyRCxzQ0FBa0M7QUFFbEMsTUFBTSxXQUFXLEdBQUcsU0FBUyxHQUFHLG1CQUFtQixDQUFDO0FBaUZwRCxJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRTtJQUN6QixjQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFBLGlCQUFZLEVBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFeEQsTUFBTSxlQUFlLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQztJQUM5QyxNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3JELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBTSxDQUFDLENBQUM7SUFFdkMsSUFBSSxlQUFlLENBQUMsTUFBTSxLQUFLLFVBQVUsQ0FBQyxNQUFNLEVBQUU7UUFDOUMsSUFBSSxlQUFlLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUU7WUFDNUMsS0FBSyxNQUFNLEdBQUcsSUFBSSxlQUFlLEVBQUU7Z0JBQy9CLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUMzQixhQUFhO29CQUNiLGNBQU0sQ0FBQyxHQUFtQixDQUFDLEdBQUcsZUFBZSxDQUFDLEdBQW1CLENBQUMsQ0FBQTtpQkFDckU7YUFDSjtTQUNKO2FBQU07WUFDSCxLQUFLLE1BQU0sR0FBRyxJQUFJLFVBQVUsRUFBRTtnQkFDMUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ2hDLGFBQWE7b0JBQ2IsY0FBTSxDQUFDLEdBQW1CLENBQUMsR0FBRyxTQUFTLENBQUM7aUJBQzNDO2FBQ0o7U0FDSjtRQUVELElBQUEsa0JBQWEsRUFBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDL0Q7Q0FDSjtLQUFNO0lBQ0gsY0FBTSxHQUFHLG1CQUFtQixFQUFFLENBQUM7SUFFL0IsSUFBQSxrQkFBYSxFQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUMvRDtBQUVELGNBQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRTtJQUN0QixJQUFBLGlDQUFvQixFQUFDLDZCQUFrQixDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFDLENBQUE7QUFFRixTQUFTLG1CQUFtQjtJQUN4QixPQUFPO1FBQ0gsWUFBWSxFQUFFLEdBQUc7UUFDakIsVUFBVSxFQUFFLGlCQUFpQjtRQUM3QixpQkFBaUIsRUFBRSxnQ0FBZ0M7UUFDbkQsaUJBQWlCLEVBQUUsSUFBSTtRQUN2QixxQkFBcUIsRUFBRSxFQUFFO1FBQ3pCLGFBQWEsRUFBRSxFQUFFO1FBQ2pCLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUNyQixrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFDdEIsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RCLGtCQUFrQixFQUFFLEVBQUU7UUFDdEIsc0JBQXNCLEVBQUUsSUFBSTtRQUM1QixvQkFBb0IsRUFBRSxHQUFHO1FBQ3pCLGVBQWUsRUFBRSxHQUFHO1FBQ3BCLHFCQUFxQixFQUFFLElBQUk7UUFDM0IscUJBQXFCLEVBQUU7WUFDbkIsU0FBUyxFQUFFLElBQUk7WUFDZixNQUFNLEVBQUUsS0FBSztZQUNiLEdBQUcsRUFBRSxLQUFLO1NBQ2I7UUFDRCxnQkFBZ0IsRUFBRSxLQUFLO1FBQ3ZCLGNBQWMsRUFBRSxLQUFLO1FBQ3JCLGVBQWUsRUFBRSxJQUFJO1FBQ3JCLHFCQUFxQixFQUFFLElBQUk7UUFDM0IsZUFBZSxFQUFFLElBQUk7UUFDckIscUJBQXFCLEVBQUUsSUFBSTtRQUMzQixRQUFRLEVBQUUsWUFBWTtRQUN0QixRQUFRLEVBQUU7WUFDTiwyQ0FBMkM7U0FDOUM7UUFDRCxzQkFBc0IsRUFBRSxJQUFJO1FBQzVCLDBCQUEwQixFQUFFLElBQUk7UUFDaEMsbUJBQW1CLEVBQUUsT0FBTztRQUM1QixpQkFBaUIsRUFBRSxHQUFHO1FBQ3RCLGNBQWMsRUFBRTtZQUNaLEtBQUssRUFBRTtnQkFDSCxTQUFTLEVBQUUsSUFBSTtnQkFDZixXQUFXLEVBQUUsT0FBTztnQkFDcEIsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsaUJBQWlCLEVBQUU7b0JBQ2YseUJBQXlCLEVBQUUsSUFBSTtvQkFDL0IseUJBQXlCLEVBQUUsSUFBSTtvQkFDL0IsaUNBQWlDLEVBQUUsSUFBSTtvQkFDdkMsc0JBQXNCLEVBQUUsSUFBSTtpQkFDL0I7YUFDSjtZQUNELE1BQU0sRUFBRTtnQkFDSixTQUFTLEVBQUUsSUFBSTtnQkFDZixXQUFXLEVBQUUsUUFBUTtnQkFDckIsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsaUJBQWlCLEVBQUU7b0JBQ2YsNEJBQTRCLEVBQUUsSUFBSTtvQkFDbEMsaUNBQWlDLEVBQUUsSUFBSTtvQkFDdkMsK0JBQStCLEVBQUUsSUFBSTtvQkFDckMsMkNBQTJDLEVBQUUsSUFBSTtpQkFDcEQ7YUFDSjtZQUNELFFBQVEsRUFBRTtnQkFDTixTQUFTLEVBQUUsSUFBSTtnQkFDZixXQUFXLEVBQUUsVUFBVTtnQkFDdkIsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDO2dCQUNmLGlCQUFpQixFQUFFO29CQUNmLDJCQUEyQixFQUFFLElBQUk7b0JBQ2pDLHNDQUFzQyxFQUFFLElBQUk7aUJBQy9DO2FBQ0o7WUFDRCxNQUFNLEVBQUU7Z0JBQ0osU0FBUyxFQUFFLElBQUk7Z0JBQ2YsV0FBVyxFQUFFLFFBQVE7Z0JBQ3JCLE9BQU8sRUFBRSxFQUFFO2dCQUNYLGlCQUFpQixFQUFFO29CQUNmLDZCQUE2QixFQUFFLElBQUk7aUJBQ3RDO2FBQ0o7U0FDSjtLQUNKLENBQUE7QUFDTCxDQUFDO0FBRUQsU0FBZ0IsY0FBYyxDQUFDLE1BQW9CO0lBQy9DLE1BQU0sSUFBSSxHQUFHLElBQUksaUJBQVUsQ0FBQyxxQkFBcUIsRUFBRTtRQUMvQyxJQUFJLGdCQUFTLENBQUMsb0JBQW9CLEVBQUUsY0FBTSxDQUFDLFVBQVUsRUFBRSxjQUFNLENBQUMsVUFBVSxDQUFDO1FBQ3pFLElBQUksZ0JBQVMsQ0FBQyw4QkFBOEIsRUFBRSxjQUFNLENBQUMsaUJBQWlCLEVBQUUsY0FBTSxDQUFDLGlCQUFpQixDQUFDO1FBQ2pHLElBQUksZ0JBQVMsQ0FBQyxxQkFBcUIsQ0FBQztRQUNwQyxJQUFJLGlCQUFVLENBQUMsRUFBRSxFQUFFLGNBQU0sQ0FBQyxpQkFBaUIsQ0FBQztRQUM1QyxJQUFJLGdCQUFTLENBQUMsK0JBQStCLEVBQUUsY0FBTSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQU0sQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNoSSxJQUFJLGdCQUFTLENBQUMsMkJBQTJCLEVBQUUsY0FBTSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQU0sQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNwSCxJQUFJLGdCQUFTLENBQUMsNEJBQTRCLEVBQUUsY0FBTSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQU0sQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN2SCxJQUFJLGdCQUFTLENBQUMsNEJBQTRCLEVBQUUsY0FBTSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQU0sQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN2SCxJQUFJLGdCQUFTLENBQUMsNEJBQTRCLEVBQUUsY0FBTSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQU0sQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN2SCxJQUFJLGdCQUFTLENBQUMsOEJBQThCLENBQUM7UUFDN0MsSUFBSSxpQkFBVSxDQUFDLEVBQUUsRUFBRSxjQUFNLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDO1FBQzFELElBQUksZ0JBQVMsQ0FBQywyQkFBMkIsQ0FBQztRQUMxQyxJQUFJLGlCQUFVLENBQUMsRUFBRSxFQUFFLGNBQU0sQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUM7UUFDdkQsSUFBSSxnQkFBUyxDQUFDLDRCQUE0QixDQUFDO1FBQzNDLElBQUksaUJBQVUsQ0FBQyxFQUFFLEVBQUUsY0FBTSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQztRQUNwRCxJQUFJLGdCQUFTLENBQUMsZ0NBQWdDLENBQUM7UUFDL0MsSUFBSSxpQkFBVSxDQUFDLEVBQUUsRUFBRSxjQUFNLENBQUMsc0JBQXNCLENBQUM7UUFDakQsSUFBSSxnQkFBUyxDQUFDLDZCQUE2QixFQUFFLGNBQU0sQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxjQUFNLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDMUgsSUFBSSxnQkFBUyxDQUFDLDJCQUEyQixFQUFFLGNBQU0sQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxjQUFNLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDcEgsSUFBSSxnQkFBUyxDQUFDLGdDQUFnQyxDQUFDO1FBQy9DLElBQUksaUJBQVUsQ0FBQyxFQUFFLEVBQUUsY0FBTSxDQUFDLDBCQUEwQixDQUFDLEVBQUUsS0FBSztLQUMvRCxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDL0MsSUFBSSxHQUFHLENBQUMsUUFBUSxLQUFLLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDNUMsT0FBTztTQUNWO1FBRUQsY0FBTSxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLGNBQU0sQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNDLGNBQU0sQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTNDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUNyQixjQUFNLENBQUMscUJBQXFCLEdBQUcsV0FBVyxDQUFDO1NBQzlDO1FBRUQsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ2xCLGNBQU0sQ0FBQyxpQkFBaUIsR0FBRyxRQUFRLENBQUM7U0FDdkM7UUFFRCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDbkIsY0FBTSxDQUFDLGtCQUFrQixHQUFHLFNBQVMsQ0FBQztTQUN6QztRQUVELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNuQixjQUFNLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFDO1NBQ3pDO1FBRUQsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ25CLGNBQU0sQ0FBQyxrQkFBa0IsR0FBRyxTQUFTLENBQUM7U0FDekM7UUFFRCxjQUFNLENBQUMscUJBQXFCLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDMUQsY0FBTSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELGNBQU0sQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwRCxjQUFNLENBQUMsc0JBQXNCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVqRCxJQUFJLHNCQUFzQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEQsSUFBSSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RELElBQUksb0JBQW9CLEdBQUcsY0FBTSxDQUFDLGlCQUFpQixDQUFDO1FBQ3BELElBQUksc0JBQXNCLEdBQUcsY0FBTSxDQUFDLG1CQUFtQixDQUFDO1FBRXhELElBQUksS0FBSyxDQUFDLG9CQUFvQixDQUFDLEVBQUU7WUFDN0Isb0JBQW9CLEdBQUcsb0JBQW9CLENBQUM7U0FDL0M7UUFFRCxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO1lBQy9CLHNCQUFzQixHQUFHLHNCQUFzQixDQUFDO1NBQ25EO1FBRUQsSUFBSSxzQkFBc0IsS0FBSyxzQkFBc0IsSUFBSSxvQkFBb0IsS0FBSyxvQkFBb0IsRUFBRTtZQUNwRyxJQUFBLDJEQUF1QyxFQUFDLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLENBQUM7U0FDdkY7UUFFRCxjQUFNLENBQUMsaUJBQWlCLEdBQUcsb0JBQW9CLENBQUM7UUFDaEQsY0FBTSxDQUFDLG1CQUFtQixHQUFHLHNCQUFzQixDQUFDO1FBRXBELGNBQU0sQ0FBQywwQkFBMEIsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXJELElBQUEsa0JBQWEsRUFBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFNUQsSUFBQSxpQ0FBb0IsRUFBQyw2QkFBa0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO0lBQzdELENBQUMsQ0FBQyxDQUFBO0FBQ04sQ0FBQztBQTFGRCx3Q0EwRkMifQ==