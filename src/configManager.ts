import {readFileSync, writeFileSync} from "fs";
import {fsutil} from "bdsx/fsutil";
import isFileSync = fsutil.isFileSync;
import {ServerPlayer} from "bdsx/bds/player";
import {CustomForm, FormInput, FormLabel, FormToggle} from "bdsx/bds/form";
import {decay} from "bdsx/decay";
import isDecayed = decay.isDecayed;

const CONFIG_PATH = __dirname + '\\..\\config.json';

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
    },
    giveWandCooldown: number,
    wandNbtEnabled: boolean,
    wandNameEnabled: boolean,
    wandTestByNameEnabled: boolean,
    wandLoreEnabled: boolean,
    wandName: string,
    wandLore: string[],
    playtimeUpdateInterval: number,
    blockPayoutInterval: number,
    blockRewardAmount: number,
    commandOptions: {
        claim: {
            isEnabled: boolean,
            commandName: string,
            aliases: string[],
            quickFormEnabled: boolean,
            subcommandOptions: {
                checkBlocksCommandEnabled: boolean,
                deleteClaimCommandEnabled: boolean,
                cancelClaimCreationCommandEnabled: boolean,
                giveWandCommandEnabled: boolean,
            }
        },
        fclaim: {
            isEnabled: boolean,
            commandName: string,
            aliases: string[],
            quickFormEnabled: boolean,
            subcommandOptions: {
                addMaxToPlayerCommandEnabled: boolean,
                removeMaxFromPlayerCommandEnabled: boolean,
                checkPlayerBlocksCommandEnabled: boolean,
                serverClaimCreationModeToggleCommandEnabled: boolean,
            }
        }
        playtime: {
            isEnabled: boolean,
            commandName: string,
            aliases: string[],
            subcommandOptions: {
                checkPlaytimeCommandEnabled: boolean,
                checkOtherPlayerPlaytimeCommandEnabled: boolean,
            }
        }
        config: {
            isEnabled: boolean,
            commandName: string,
            aliases: string[],
            subcommandOptions: {
                editQuickConfigCommandEnabled: boolean,
            }
        }
    }
}

export let CONFIG: Config;

if (isFileSync(CONFIG_PATH)) {
    CONFIG = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
} else {
    CONFIG = createDefaultConfig();

    writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG, null, 4));
}

function createDefaultConfig(): Config {
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
    }
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
    ]);

    form.sendTo(player.getNetworkIdentifier(), (res) => {
        if (res.response === null || isDecayed(player)) {
            return;
        }

        CONFIG.wandItemId = res.response[0];
        CONFIG.visualiseParticle = res.response[1];
        CONFIG.visualiserEnabled = res.response[3];
        CONFIG.visualiserLineDensity = res.response[4];

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

        writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG, null, 4));
    })
}