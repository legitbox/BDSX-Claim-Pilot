import {events} from "bdsx/event";
import {command, CustomCommandFactory} from "bdsx/command";
import {CONFIG, sendConfigForm} from "./configManager";
import {getClaimBuilder, stopBuilder} from "./claims/claimBuilder";
import {
    addToMaxBlocks,
    getPlayerFreeBlocks,
    getPlayerMaxBlocks,
    removeFromMaxBlocks
} from "./claims/claimBlocksManager";
import {Claim, deleteClaim, getClaimAtPos} from "./claims/claim";
import {CommandPermissionLevel, PlayerCommandSelector} from "bdsx/bds/command";
import {int32_t} from "bdsx/nativetype";
import {createWand} from "./utils";
import {sendPlaytimeFormForPlayer} from "./playerPlaytime/playtime";
import {bedrockServer} from "bdsx/launcher";
import {FormButton, SimpleForm} from "bdsx/bds/form";
import {decay} from "bdsx/decay";
import isDecayed = decay.isDecayed;
import {getCurrentClaim} from "./claims/claimDetection";
import {ServerPlayer} from "bdsx/bds/player";

let claimCommand: CustomCommandFactory | undefined = undefined;
let moderatorClaimCommand: CustomCommandFactory | undefined = undefined;
let playtimeCommand: CustomCommandFactory | undefined = undefined;
let configCommand: CustomCommandFactory | undefined = undefined;

const wandCooldownMap: Map<string, number> = new Map();

events.serverOpen.on(() => {
    // Handling claim command
    if (CONFIG.commandOptions.claim.isEnabled) {
        claimCommand = command.register(CONFIG.commandOptions.claim.commandName, 'Command for managing claims!');

        for (const alias of CONFIG.commandOptions.claim.aliases) {
            claimCommand.alias(alias);
        }

        if (CONFIG.commandOptions.claim.quickFormEnabled) {
            claimCommand
                .overload((_p, origin, output) => {
                    const player = origin.getEntity();
                    if (player === null || !player.isPlayer()) {
                        output.error('Command needs to be ran by a player!');
                        return;
                    }

                    sendClaimForm(player.getXuid());
                }, {})
        }

        if (CONFIG.commandOptions.claim.subcommandOptions.cancelClaimCreationCommandEnabled) {
            claimCommand
                .overload((params, origin, output) => {
                    const player = origin.getEntity();
                    if (player === null || !player.isPlayer()) {
                        output.error('Command needs to be ran by a player!');
                        return;
                    }

                    const xuid = player.getXuid();

                    const res = cancelClaim(xuid)

                    if (res === CancelClaimResult.Success) {
                        output.success('§aClaim creation canceled!');
                    } else {
                        output.error('You are not creating a claim!');
                    }
                }, {
                    options: command.enum('options.cancel', 'cancel'),
                })
        }

        if (CONFIG.commandOptions.claim.subcommandOptions.checkBlocksCommandEnabled) {
            claimCommand
                .overload((params, origin, output) => {
                    const player = origin.getEntity();
                    if (player === null || !player.isPlayer()) {
                        output.error('Command needs to be ran by a player!');
                        return;
                    }

                    const xuid = player.getXuid();

                    output.success(getCheckBlocksResultString(xuid));
                }, {
                    options: command.enum('options.blocks', 'blocks'),
                })
        }

        if (CONFIG.commandOptions.claim.subcommandOptions.deleteClaimCommandEnabled) {
            claimCommand
                .overload((params, origin, output) => {
                    const player = origin.getEntity();
                    if (player === null || !player.isPlayer()) {
                        output.error('Command needs to be ran by a player!');
                        return;
                    }

                    const xuid = player.getXuid();
                    const claim = getClaimAtPos(player.getPosition(), player.getDimensionId());
                    if (claim === undefined) {
                        output.error('You are not in a claim!');
                        return;
                    }

                    const res = deleteClaimCommand(xuid, claim, player.getCommandPermissionLevel());
                    if (res === DeleteClaimEnumResult.Success) {
                        output.success(`§aClaim deleted, §e${claim.totalBlocks()}§a blocks freed!`);
                    } else {
                        output.error('You do not have permission to delete that claim!');
                    }
                }, {
                    options: command.enum('options.delete', 'delete'),
                })
        }

        if (CONFIG.commandOptions.claim.subcommandOptions.giveWandCommandEnabled) {
            claimCommand
                .overload((_p, origin, output) => {
                    const player = origin.getEntity();
                    if (player === null || !player.isPlayer()) {
                        output.error('Command needs to be ran by a player!');
                        return;
                    }

                    const xuid = player.getXuid();
                    const lastRequestTime = wandCooldownMap.get(xuid);
                    const now = Date.now();
                    if (lastRequestTime !== undefined && now - lastRequestTime <= CONFIG.giveWandCooldown) {
                        output.error(`You need to wait ${Math.floor((CONFIG.giveWandCooldown - (now - lastRequestTime))/1000)} more seconds before requesting a new wand!`);
                        return;
                    }

                    const wandItem = createWand();
                    const didAdd = player.getInventory().addItem(wandItem, true);
                    if (didAdd === false) {
                        output.error('You dont have enough free space in your inventory for the wand!');
                        return;
                    }

                    player.sendInventory()

                    wandCooldownMap.set(xuid, now);

                    output.success('§aClaim wand given!');
                }, {
                    options: command.enum('options.wand', 'wand'),
                })
        }
    }

    if (CONFIG.commandOptions.fclaim.isEnabled) {
        moderatorClaimCommand = command.register(
            CONFIG.commandOptions.fclaim.commandName,
            'Moderator command for managing claim stuff!',
            CommandPermissionLevel.Operator
        );

        for (const alias of CONFIG.commandOptions.fclaim.aliases) {
            moderatorClaimCommand.alias(alias);
        }

        if (CONFIG.commandOptions.fclaim.subcommandOptions.addMaxToPlayerCommandEnabled) {
            moderatorClaimCommand
                .overload((params, origin, output) => {
                    const players = params.player.newResults(origin);
                    for (const player of players) {
                        const newMax = addToMaxBlocks(player.getXuid(), params.amount);
                        output.success(`§e${player.getName()}§a now has §e${newMax}§a max blocks!`);
                    }
                }, {
                    options: command.enum('options.addmax', 'addmax'),
                    player: PlayerCommandSelector,
                    amount: int32_t,
                })
        }

        if (CONFIG.commandOptions.fclaim.subcommandOptions.removeMaxFromPlayerCommandEnabled) {
            moderatorClaimCommand
                .overload((params, origin, output) => {
                    const players = params.player.newResults(origin);
                    for (const player of players) {
                        const newMax = removeFromMaxBlocks(player.getXuid(), params.amount);
                        output.success(`§e${player.getName()}§a now has §e${newMax}§a max blocks!`);
                    }
                }, {
                    options: command.enum('options.removemax', 'removemax'),
                    player: PlayerCommandSelector,
                    amount: int32_t,
                })
        }

        if (CONFIG.commandOptions.fclaim.subcommandOptions.checkPlayerBlocksCommandEnabled) {
            moderatorClaimCommand
                .overload((params, origin, output) => {
                    const players = params.player.newResults(origin);
                    for (const player of players) {
                        const xuid = player.getXuid();
                        output.success(`§e${player.getName()}§a has §e${getPlayerFreeBlocks(xuid)}§a blocks out of §e${getPlayerMaxBlocks(xuid)}§a max blocks!`);
                    }
                }, {
                    options: command.enum('options.blocks', 'blocks'),
                    player: PlayerCommandSelector,
                })
        }
    }

    if (CONFIG.commandOptions.playtime.isEnabled) {
        playtimeCommand = command.register(
            CONFIG.commandOptions.playtime.commandName,
            'Command for managing playtime!'
        );

        for (const alias of CONFIG.commandOptions.playtime.aliases) {
            playtimeCommand.alias(alias);
        }

        if (CONFIG.commandOptions.playtime.subcommandOptions.checkPlaytimeCommandEnabled) {
            playtimeCommand.overload((_p, origin ,output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }

                const xuid = player.getXuid();
                sendPlaytimeFormForPlayer(xuid, xuid);
            }, {})
        }

        if (CONFIG.commandOptions.playtime.subcommandOptions.checkOtherPlayerPlaytimeCommandEnabled) {
            playtimeCommand.overload((params, origin, output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }

                const xuid = player.getXuid();

                const targets = params.target.newResults(origin);
                if (targets.length > 1) {
                    output.error('Too many targets matched selector!');
                    return;
                } else if (targets.length === 0) {
                    output.error('No target matched selector!');
                    return;
                }

                sendPlaytimeFormForPlayer(xuid, targets[0].getXuid());
            }, {
                target: PlayerCommandSelector,
            });
        }
    }

    if (CONFIG.commandOptions.config.isEnabled) {
        configCommand = command.register(CONFIG.commandOptions.config.commandName, 'Command for editing the config!');

        for (const alias of CONFIG.commandOptions.config.aliases) {
            configCommand.alias(alias);
        }

        if (CONFIG.commandOptions.config.subcommandOptions.editQuickConfigCommandEnabled) {
            configCommand
                .overload((_p, origin, output) => {
                    const player = origin.getEntity();
                    if (player === null || !player.isPlayer()) {
                        output.error('Command needs to be ran by a player!');
                        return;
                    }

                    sendConfigForm(player);
                }, {
                    options: command.enum('options.edit', 'edit'),
                })
        }
    }
})

function sendClaimForm(xuid: string) {
    const player = bedrockServer.level.getPlayerByXuid(xuid);
    if (player === null) {
        return;
    }

    const buttonIds: string[] = [];
    const buttons = [];

    if (CONFIG.commandOptions.claim.subcommandOptions.cancelClaimCreationCommandEnabled) {
        buttons.push(new FormButton('Cancel Claim Creation'));
        buttonIds.push('cancel');
    }

    if (CONFIG.commandOptions.claim.subcommandOptions.deleteClaimCommandEnabled) {
        buttons.push(new FormButton('Delete claim'));
        buttonIds.push('delete');
    }

    if (CONFIG.commandOptions.claim.subcommandOptions.checkBlocksCommandEnabled) {
        buttons.push(new FormButton('Check Blocks'));
        buttonIds.push('blocks');
    }

    if (CONFIG.commandOptions.claim.subcommandOptions.giveWandCommandEnabled) {
        buttons.push(new FormButton('Get Claim Wand'));
        buttonIds.push('wand');
    }

    const form = new SimpleForm('Claim Subcommands', 'Select an option:', buttons);

    form.sendTo(player.getNetworkIdentifier(), (form) => {
        if (form.response === undefined || isDecayed(player)) {
            return;
        }

        const id = buttonIds[form.response];

        switch (id) {
            case 'cancel':
                const cancelResult = cancelClaim(xuid);

                if (cancelResult === CancelClaimResult.Success) {
                    player.sendMessage('§aClaim creation canceled!');
                } else {
                    player.sendMessage('§cYou are not creating a claim!');
                }
                break;
            case 'delete':
                const claim = getCurrentClaim(xuid);
                if (claim === undefined) {
                    player.sendMessage('§cYou are not in a claim!');
                    return;
                }
                const deleteResult = deleteClaimCommand(xuid, claim, player.getCommandPermissionLevel());
                if (deleteResult === DeleteClaimEnumResult.Success) {
                    player.sendMessage(`§aClaim deleted, §e${claim.totalBlocks()}§a blocks freed!`)
                } else {
                    player.sendMessage(`§cYou do not have permission to delete that claim!`);
                }
                break;
            case 'blocks':
                player.sendMessage(getCheckBlocksResultString(xuid));
                break;
            case 'wand':
                getWandCommand(player);
                break;
        }

    });
}

enum CancelClaimResult {
    Success,
    NotABuilder,
}
function cancelClaim(xuid: string) {
    const builder = getClaimBuilder(xuid);

    if (builder === undefined) {
        return CancelClaimResult.NotABuilder;
    }

    stopBuilder(xuid);

    return CancelClaimResult.Success;
}

enum DeleteClaimEnumResult {
    Success,
    InsufficientPermissions,
}

function deleteClaimCommand(xuid: string, claim: Claim, permissionLevel: CommandPermissionLevel) {
    if (claim.owner !== xuid && permissionLevel === CommandPermissionLevel.Normal) {
        return DeleteClaimEnumResult.InsufficientPermissions;
    }

    deleteClaim(claim);

    return DeleteClaimEnumResult.Success;
}

function getCheckBlocksResultString(xuid: string) {
    const maxBlocks = getPlayerMaxBlocks(xuid);
    const freeBlock = getPlayerFreeBlocks(xuid);

    return `§aYou have §e${freeBlock}§a free blocks out of §e${maxBlocks}§a!`;
}

function getWandCommand(player: ServerPlayer) {
    const xuid = player.getXuid();
    const lastRequestTime = wandCooldownMap.get(xuid);
    const now = Date.now();
    if (lastRequestTime !== undefined && now - lastRequestTime <= CONFIG.giveWandCooldown) {
        player.sendMessage(`§cYou need to wait ${Math.floor((CONFIG.giveWandCooldown - (now - lastRequestTime))/1000)} more seconds before requesting a new wand!`);
        return;
    }

    const wandItem = createWand();
    const didAdd = player.getInventory().addItem(wandItem, true);
    if (!didAdd) {
        player.sendMessage('§cYou dont have enough free space in your inventory for the wand!');
        return;
    }

    player.sendInventory()

    wandCooldownMap.set(xuid, now);

    player.sendMessage('§aClaim wand given!');
}