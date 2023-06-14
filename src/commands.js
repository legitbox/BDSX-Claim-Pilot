"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_1 = require("bdsx/event");
const command_1 = require("bdsx/command");
const configManager_1 = require("./configManager");
const claimBuilder_1 = require("./claims/claimBuilder");
const claimBlocksManager_1 = require("./claims/claimBlocksManager");
const claim_1 = require("./claims/claim");
const command_2 = require("bdsx/bds/command");
const nativetype_1 = require("bdsx/nativetype");
const utils_1 = require("./utils");
const playtime_1 = require("./playerPlaytime/playtime");
const launcher_1 = require("bdsx/launcher");
const form_1 = require("bdsx/bds/form");
const decay_1 = require("bdsx/decay");
const claimDetection_1 = require("./claims/claimDetection");
var isDecayed = decay_1.decay.isDecayed;
let claimCommand = undefined;
let moderatorClaimCommand = undefined;
let playtimeCommand = undefined;
let configCommand = undefined;
const wandCooldownMap = new Map();
event_1.events.serverOpen.on(() => {
    // Handling claim command
    if (configManager_1.CONFIG.commandOptions.claim.isEnabled) {
        claimCommand = command_1.command.register(configManager_1.CONFIG.commandOptions.claim.commandName, 'Command for managing claims!');
        for (const alias of configManager_1.CONFIG.commandOptions.claim.aliases) {
            claimCommand.alias(alias);
        }
        if (configManager_1.CONFIG.commandOptions.claim.quickFormEnabled) {
            claimCommand
                .overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }
                sendClaimForm(player.getXuid());
            }, {});
        }
        if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.cancelClaimCreationCommandEnabled) {
            claimCommand
                .overload((params, origin, output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }
                const xuid = player.getXuid();
                const res = cancelClaim(xuid);
                if (res === CancelClaimResult.Success) {
                    output.success('§aClaim creation canceled!');
                }
                else {
                    output.error('You are not creating a claim!');
                }
            }, {
                options: command_1.command.enum('options.cancel', 'cancel'),
            });
        }
        if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.checkBlocksCommandEnabled) {
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
                options: command_1.command.enum('options.blocks', 'blocks'),
            });
        }
        if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.deleteClaimCommandEnabled) {
            claimCommand
                .overload((params, origin, output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }
                const xuid = player.getXuid();
                const claim = (0, claim_1.getClaimAtPos)(player.getPosition(), player.getDimensionId());
                if (claim === undefined) {
                    output.error('You are not in a claim!');
                    return;
                }
                const res = deleteClaimCommand(xuid, claim, player.getCommandPermissionLevel());
                if (res === DeleteClaimEnumResult.Success) {
                    output.success(`§aClaim deleted, §e${claim.totalBlocks()}§a blocks freed!`);
                }
                else {
                    output.error('You do not have permission to delete that claim!');
                }
            }, {
                options: command_1.command.enum('options.delete', 'delete'),
            });
        }
        if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.giveWandCommandEnabled) {
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
                if (lastRequestTime !== undefined && now - lastRequestTime <= configManager_1.CONFIG.giveWandCooldown) {
                    output.error(`You need to wait ${Math.floor((configManager_1.CONFIG.giveWandCooldown - (now - lastRequestTime)) / 1000)} more seconds before requesting a new wand!`);
                    return;
                }
                const wandItem = (0, utils_1.createWand)();
                const didAdd = player.getInventory().addItem(wandItem, true);
                if (didAdd === false) {
                    output.error('You dont have enough free space in your inventory for the wand!');
                    return;
                }
                player.sendInventory();
                wandCooldownMap.set(xuid, now);
                output.success('§aClaim wand given!');
            }, {
                options: command_1.command.enum('options.wand', 'wand'),
            });
        }
        if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.addPlayerCommandEnabled) {
            claimCommand
                .overload((params, origin, output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error("Command needs to be ran by a player!");
                    return;
                }
                const claim = (0, claim_1.getClaimAtPos)(player.getPosition(), player.getDimensionId());
                if (claim === undefined) {
                    output.error('You are not in a claim!');
                    return;
                }
                const xuid = player.getXuid();
                if (claim.owner !== xuid &&
                    player.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Normal &&
                    !(0, claim_1.playerHasPerms)(claim, xuid, claim_1.ClaimPermissionTypes.EditMembers)) {
                    output.error('You dont have permission to add players to this claim!');
                    return;
                }
                const targets = params.target.newResults(origin);
                if (targets.length === 0) {
                    output.error('No targets matched selector');
                    return;
                }
                const members = Object.keys(claim.members);
                for (const target of targets) {
                    const targetXuid = target.getXuid();
                    const name = target.getName();
                    if (members.includes(targetXuid) || claim.owner === targetXuid) {
                        output.error(`§e${name}§c already a member of §e${claim.name}§c!`);
                        continue;
                    }
                    claim.members[targetXuid] = (0, claim_1.createDefaultClaimPermission)();
                    output.success(`§e${name}§a added to §e${claim.name}§a!`);
                }
            }, {
                options: command_1.command.enum('options.addplayer', 'addplayer'),
                target: command_2.PlayerCommandSelector,
            });
        }
        if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.removePlayerCommandEnabled) {
            claimCommand
                .overload((params, origin, output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error("Command needs to be ran by a player!");
                    return;
                }
                const claim = (0, claim_1.getClaimAtPos)(player.getPosition(), player.getDimensionId());
                if (claim === undefined) {
                    output.error('You are not in a claim!');
                    return;
                }
                const xuid = player.getXuid();
                if (claim.owner !== xuid &&
                    player.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Normal &&
                    !(0, claim_1.playerHasPerms)(claim, xuid, claim_1.ClaimPermissionTypes.EditMembers)) {
                    output.error('You dont have permission to remove players from this claim!');
                    return;
                }
                const targets = params.target.newResults(origin);
                if (targets.length === 0) {
                    output.error('No targets matched selector');
                    return;
                }
                const members = Object.keys(claim.members);
                for (const target of targets) {
                    const targetXuid = target.getXuid();
                    const name = target.getName();
                    if (claim.owner === targetXuid) {
                        output.error('§cYou cant remove the owner form a claim!');
                        continue;
                    }
                    else if (!members.includes(targetXuid)) {
                        output.error(`§e${name}§c is not a member of §e${claim.name}§c!`);
                        continue;
                    }
                    delete claim.members[targetXuid];
                    output.success(`§e${name}§a removed from §e${claim.name}§a!`);
                }
            }, {
                options: command_1.command.enum('options.removeplayer', 'removeplayer'),
                target: command_2.PlayerCommandSelector,
            });
        }
    }
    if (configManager_1.CONFIG.commandOptions.fclaim.isEnabled) {
        moderatorClaimCommand = command_1.command.register(configManager_1.CONFIG.commandOptions.fclaim.commandName, 'Moderator command for managing claim stuff!', command_2.CommandPermissionLevel.Operator);
        for (const alias of configManager_1.CONFIG.commandOptions.fclaim.aliases) {
            moderatorClaimCommand.alias(alias);
        }
        if (configManager_1.CONFIG.commandOptions.fclaim.subcommandOptions.addMaxToPlayerCommandEnabled) {
            moderatorClaimCommand
                .overload((params, origin, output) => {
                const players = params.player.newResults(origin);
                for (const player of players) {
                    const newMax = (0, claimBlocksManager_1.addToMaxBlocks)(player.getXuid(), params.amount);
                    output.success(`§e${player.getName()}§a now has §e${newMax}§a max blocks!`);
                }
            }, {
                options: command_1.command.enum('options.addmax', 'addmax'),
                player: command_2.PlayerCommandSelector,
                amount: nativetype_1.int32_t,
            });
        }
        if (configManager_1.CONFIG.commandOptions.fclaim.subcommandOptions.removeMaxFromPlayerCommandEnabled) {
            moderatorClaimCommand
                .overload((params, origin, output) => {
                const players = params.player.newResults(origin);
                for (const player of players) {
                    const newMax = (0, claimBlocksManager_1.removeFromMaxBlocks)(player.getXuid(), params.amount);
                    output.success(`§e${player.getName()}§a now has §e${newMax}§a max blocks!`);
                }
            }, {
                options: command_1.command.enum('options.removemax', 'removemax'),
                player: command_2.PlayerCommandSelector,
                amount: nativetype_1.int32_t,
            });
        }
        if (configManager_1.CONFIG.commandOptions.fclaim.subcommandOptions.checkPlayerBlocksCommandEnabled) {
            moderatorClaimCommand
                .overload((params, origin, output) => {
                const players = params.player.newResults(origin);
                for (const player of players) {
                    const xuid = player.getXuid();
                    output.success(`§e${player.getName()}§a has §e${(0, claimBlocksManager_1.getPlayerFreeBlocks)(xuid)}§a blocks out of §e${(0, claimBlocksManager_1.getPlayerMaxBlocks)(xuid)}§a max blocks!`);
                }
            }, {
                options: command_1.command.enum('options.blocks', 'blocks'),
                player: command_2.PlayerCommandSelector,
            });
        }
    }
    if (configManager_1.CONFIG.commandOptions.playtime.isEnabled) {
        playtimeCommand = command_1.command.register(configManager_1.CONFIG.commandOptions.playtime.commandName, 'Command for managing playtime!');
        for (const alias of configManager_1.CONFIG.commandOptions.playtime.aliases) {
            playtimeCommand.alias(alias);
        }
        if (configManager_1.CONFIG.commandOptions.playtime.subcommandOptions.checkPlaytimeCommandEnabled) {
            playtimeCommand.overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }
                const xuid = player.getXuid();
                (0, playtime_1.sendPlaytimeFormForPlayer)(xuid, xuid);
            }, {});
        }
        if (configManager_1.CONFIG.commandOptions.playtime.subcommandOptions.checkOtherPlayerPlaytimeCommandEnabled) {
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
                }
                else if (targets.length === 0) {
                    output.error('No target matched selector!');
                    return;
                }
                (0, playtime_1.sendPlaytimeFormForPlayer)(xuid, targets[0].getXuid());
            }, {
                target: command_2.PlayerCommandSelector,
            });
        }
    }
    if (configManager_1.CONFIG.commandOptions.config.isEnabled) {
        configCommand = command_1.command.register(configManager_1.CONFIG.commandOptions.config.commandName, 'Command for editing the config!', command_2.CommandPermissionLevel.Operator);
        for (const alias of configManager_1.CONFIG.commandOptions.config.aliases) {
            configCommand.alias(alias);
        }
        if (configManager_1.CONFIG.commandOptions.config.subcommandOptions.editQuickConfigCommandEnabled) {
            configCommand
                .overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }
                (0, configManager_1.sendConfigForm)(player);
            }, {
                options: command_1.command.enum('options.edit', 'edit'),
            });
        }
    }
});
function sendClaimForm(xuid) {
    const player = launcher_1.bedrockServer.level.getPlayerByXuid(xuid);
    if (player === null) {
        return;
    }
    const buttonIds = [];
    const buttons = [];
    if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.cancelClaimCreationCommandEnabled) {
        buttons.push(new form_1.FormButton('Cancel Claim Creation'));
        buttonIds.push('cancel');
    }
    if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.deleteClaimCommandEnabled) {
        buttons.push(new form_1.FormButton('Delete claim'));
        buttonIds.push('delete');
    }
    if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.checkBlocksCommandEnabled) {
        buttons.push(new form_1.FormButton('Check Blocks'));
        buttonIds.push('blocks');
    }
    if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.giveWandCommandEnabled) {
        buttons.push(new form_1.FormButton('Get Claim Wand'));
        buttonIds.push('wand');
    }
    const form = new form_1.SimpleForm('Claim Subcommands', 'Select an option:', buttons);
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
                }
                else {
                    player.sendMessage('§cYou are not creating a claim!');
                }
                break;
            case 'delete':
                const claim = (0, claimDetection_1.getCurrentClaim)(xuid);
                if (claim === undefined) {
                    player.sendMessage('§cYou are not in a claim!');
                    return;
                }
                const deleteResult = deleteClaimCommand(xuid, claim, player.getCommandPermissionLevel());
                if (deleteResult === DeleteClaimEnumResult.Success) {
                    player.sendMessage(`§aClaim deleted, §e${claim.totalBlocks()}§a blocks freed!`);
                }
                else {
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
var CancelClaimResult;
(function (CancelClaimResult) {
    CancelClaimResult[CancelClaimResult["Success"] = 0] = "Success";
    CancelClaimResult[CancelClaimResult["NotABuilder"] = 1] = "NotABuilder";
})(CancelClaimResult || (CancelClaimResult = {}));
function cancelClaim(xuid) {
    const builder = (0, claimBuilder_1.getClaimBuilder)(xuid);
    if (builder === undefined) {
        return CancelClaimResult.NotABuilder;
    }
    (0, claimBuilder_1.stopBuilder)(xuid);
    return CancelClaimResult.Success;
}
var DeleteClaimEnumResult;
(function (DeleteClaimEnumResult) {
    DeleteClaimEnumResult[DeleteClaimEnumResult["Success"] = 0] = "Success";
    DeleteClaimEnumResult[DeleteClaimEnumResult["InsufficientPermissions"] = 1] = "InsufficientPermissions";
})(DeleteClaimEnumResult || (DeleteClaimEnumResult = {}));
function deleteClaimCommand(xuid, claim, permissionLevel) {
    if (claim.owner !== xuid && permissionLevel === command_2.CommandPermissionLevel.Normal) {
        return DeleteClaimEnumResult.InsufficientPermissions;
    }
    (0, claim_1.deleteClaim)(claim);
    return DeleteClaimEnumResult.Success;
}
function getCheckBlocksResultString(xuid) {
    const maxBlocks = (0, claimBlocksManager_1.getPlayerMaxBlocks)(xuid);
    const freeBlock = (0, claimBlocksManager_1.getPlayerFreeBlocks)(xuid);
    return `§aYou have §e${freeBlock}§a free blocks out of §e${maxBlocks}§a!`;
}
function getWandCommand(player) {
    const xuid = player.getXuid();
    const lastRequestTime = wandCooldownMap.get(xuid);
    const now = Date.now();
    if (lastRequestTime !== undefined && now - lastRequestTime <= configManager_1.CONFIG.giveWandCooldown) {
        player.sendMessage(`§cYou need to wait ${Math.floor((configManager_1.CONFIG.giveWandCooldown - (now - lastRequestTime)) / 1000)} more seconds before requesting a new wand!`);
        return;
    }
    const wandItem = (0, utils_1.createWand)();
    const didAdd = player.getInventory().addItem(wandItem, true);
    if (!didAdd) {
        player.sendMessage('§cYou dont have enough free space in your inventory for the wand!');
        return;
    }
    player.sendInventory();
    wandCooldownMap.set(xuid, now);
    player.sendMessage('§aClaim wand given!');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNDQUFrQztBQUNsQywwQ0FBMkQ7QUFDM0QsbURBQXVEO0FBQ3ZELHdEQUFtRTtBQUNuRSxvRUFLcUM7QUFDckMsMENBT3dCO0FBQ3hCLDhDQUErRTtBQUMvRSxnREFBd0M7QUFDeEMsbUNBQW1DO0FBQ25DLHdEQUFvRTtBQUNwRSw0Q0FBNEM7QUFDNUMsd0NBQXFEO0FBQ3JELHNDQUFpQztBQUNqQyw0REFBd0Q7QUFFeEQsSUFBTyxTQUFTLEdBQUcsYUFBSyxDQUFDLFNBQVMsQ0FBQztBQUVuQyxJQUFJLFlBQVksR0FBcUMsU0FBUyxDQUFDO0FBQy9ELElBQUkscUJBQXFCLEdBQXFDLFNBQVMsQ0FBQztBQUN4RSxJQUFJLGVBQWUsR0FBcUMsU0FBUyxDQUFDO0FBQ2xFLElBQUksYUFBYSxHQUFxQyxTQUFTLENBQUM7QUFFaEUsTUFBTSxlQUFlLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7QUFFdkQsY0FBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFO0lBQ3RCLHlCQUF5QjtJQUN6QixJQUFJLHNCQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUU7UUFDdkMsWUFBWSxHQUFHLGlCQUFPLENBQUMsUUFBUSxDQUFDLHNCQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsOEJBQThCLENBQUMsQ0FBQztRQUV6RyxLQUFLLE1BQU0sS0FBSyxJQUFJLHNCQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUU7WUFDckQsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUM3QjtRQUVELElBQUksc0JBQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFO1lBQzlDLFlBQVk7aUJBQ1AsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDN0IsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUU7b0JBQ3ZDLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0NBQXNDLENBQUMsQ0FBQztvQkFDckQsT0FBTztpQkFDVjtnQkFFRCxhQUFhLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDcEMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1NBQ2I7UUFFRCxJQUFJLHNCQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxpQ0FBaUMsRUFBRTtZQUNqRixZQUFZO2lCQUNQLFFBQVEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFO29CQUN2QyxNQUFNLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7b0JBQ3JELE9BQU87aUJBQ1Y7Z0JBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUU5QixNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBRTdCLElBQUksR0FBRyxLQUFLLGlCQUFpQixDQUFDLE9BQU8sRUFBRTtvQkFDbkMsTUFBTSxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO2lCQUNoRDtxQkFBTTtvQkFDSCxNQUFNLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7aUJBQ2pEO1lBQ0wsQ0FBQyxFQUFFO2dCQUNDLE9BQU8sRUFBRSxpQkFBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxRQUFRLENBQUM7YUFDcEQsQ0FBQyxDQUFBO1NBQ1Q7UUFFRCxJQUFJLHNCQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyx5QkFBeUIsRUFBRTtZQUN6RSxZQUFZO2lCQUNQLFFBQVEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFO29CQUN2QyxNQUFNLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7b0JBQ3JELE9BQU87aUJBQ1Y7Z0JBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUU5QixNQUFNLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDckQsQ0FBQyxFQUFFO2dCQUNDLE9BQU8sRUFBRSxpQkFBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxRQUFRLENBQUM7YUFDcEQsQ0FBQyxDQUFBO1NBQ1Q7UUFFRCxJQUFJLHNCQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyx5QkFBeUIsRUFBRTtZQUN6RSxZQUFZO2lCQUNQLFFBQVEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFO29CQUN2QyxNQUFNLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7b0JBQ3JELE9BQU87aUJBQ1Y7Z0JBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM5QixNQUFNLEtBQUssR0FBRyxJQUFBLHFCQUFhLEVBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO2dCQUMzRSxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7b0JBQ3JCLE1BQU0sQ0FBQyxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztvQkFDeEMsT0FBTztpQkFDVjtnQkFFRCxNQUFNLEdBQUcsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUM7Z0JBQ2hGLElBQUksR0FBRyxLQUFLLHFCQUFxQixDQUFDLE9BQU8sRUFBRTtvQkFDdkMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsS0FBSyxDQUFDLFdBQVcsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO2lCQUMvRTtxQkFBTTtvQkFDSCxNQUFNLENBQUMsS0FBSyxDQUFDLGtEQUFrRCxDQUFDLENBQUM7aUJBQ3BFO1lBQ0wsQ0FBQyxFQUFFO2dCQUNDLE9BQU8sRUFBRSxpQkFBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxRQUFRLENBQUM7YUFDcEQsQ0FBQyxDQUFBO1NBQ1Q7UUFFRCxJQUFJLHNCQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRTtZQUN0RSxZQUFZO2lCQUNQLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQzdCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFO29CQUN2QyxNQUFNLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7b0JBQ3JELE9BQU87aUJBQ1Y7Z0JBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM5QixNQUFNLGVBQWUsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNsRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksZUFBZSxLQUFLLFNBQVMsSUFBSSxHQUFHLEdBQUcsZUFBZSxJQUFJLHNCQUFNLENBQUMsZ0JBQWdCLEVBQUU7b0JBQ25GLE1BQU0sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxzQkFBTSxDQUFDLGdCQUFnQixHQUFHLENBQUMsR0FBRyxHQUFHLGVBQWUsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLENBQUM7b0JBQ3BKLE9BQU87aUJBQ1Y7Z0JBRUQsTUFBTSxRQUFRLEdBQUcsSUFBQSxrQkFBVSxHQUFFLENBQUM7Z0JBQzlCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM3RCxJQUFJLE1BQU0sS0FBSyxLQUFLLEVBQUU7b0JBQ2xCLE1BQU0sQ0FBQyxLQUFLLENBQUMsaUVBQWlFLENBQUMsQ0FBQztvQkFDaEYsT0FBTztpQkFDVjtnQkFFRCxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUE7Z0JBRXRCLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUUvQixNQUFNLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDMUMsQ0FBQyxFQUFFO2dCQUNDLE9BQU8sRUFBRSxpQkFBTyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO2FBQ2hELENBQUMsQ0FBQTtTQUNUO1FBRUQsSUFBSSxzQkFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLEVBQUU7WUFDdkUsWUFBWTtpQkFDUCxRQUFRLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUNqQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2xDLElBQUksTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRTtvQkFDdkMsTUFBTSxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO29CQUNyRCxPQUFPO2lCQUNWO2dCQUVELE1BQU0sS0FBSyxHQUFHLElBQUEscUJBQWEsRUFBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7Z0JBQzNFLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTtvQkFDckIsTUFBTSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO29CQUN4QyxPQUFPO2lCQUNWO2dCQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDOUIsSUFDSSxLQUFLLENBQUMsS0FBSyxLQUFLLElBQUk7b0JBQ3BCLE1BQU0sQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLGdDQUFzQixDQUFDLE1BQU07b0JBQ3BFLENBQUMsSUFBQSxzQkFBYyxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsNEJBQW9CLENBQUMsV0FBVyxDQUFDLEVBQ2hFO29CQUNFLE1BQU0sQ0FBQyxLQUFLLENBQUMsd0RBQXdELENBQUMsQ0FBQztvQkFDdkUsT0FBTztpQkFDVjtnQkFFRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDakQsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDdEIsTUFBTSxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO29CQUM1QyxPQUFPO2lCQUNWO2dCQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMzQyxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtvQkFDMUIsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNwQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQzlCLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxLQUFLLFVBQVUsRUFBRTt3QkFDNUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksNEJBQTRCLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDO3dCQUNuRSxTQUFTO3FCQUNaO29CQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsSUFBQSxvQ0FBNEIsR0FBRSxDQUFDO29CQUMzRCxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxpQkFBaUIsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUM7aUJBQzdEO1lBQ0wsQ0FBQyxFQUFFO2dCQUNDLE9BQU8sRUFBRSxpQkFBTyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxXQUFXLENBQUM7Z0JBQ3ZELE1BQU0sRUFBRSwrQkFBcUI7YUFDaEMsQ0FBQyxDQUFBO1NBQ1Q7UUFFRCxJQUFJLHNCQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQywwQkFBMEIsRUFBRTtZQUMxRSxZQUFZO2lCQUNQLFFBQVEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFO29CQUN2QyxNQUFNLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7b0JBQ3JELE9BQU87aUJBQ1Y7Z0JBRUQsTUFBTSxLQUFLLEdBQUcsSUFBQSxxQkFBYSxFQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztnQkFDM0UsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFO29CQUNyQixNQUFNLENBQUMsS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7b0JBQ3hDLE9BQU87aUJBQ1Y7Z0JBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM5QixJQUNJLEtBQUssQ0FBQyxLQUFLLEtBQUssSUFBSTtvQkFDcEIsTUFBTSxDQUFDLHlCQUF5QixFQUFFLEtBQUssZ0NBQXNCLENBQUMsTUFBTTtvQkFDcEUsQ0FBQyxJQUFBLHNCQUFjLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBRSw0QkFBb0IsQ0FBQyxXQUFXLENBQUMsRUFDaEU7b0JBQ0UsTUFBTSxDQUFDLEtBQUssQ0FBQyw2REFBNkQsQ0FBQyxDQUFDO29CQUM1RSxPQUFPO2lCQUNWO2dCQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNqRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO29CQUN0QixNQUFNLENBQUMsS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7b0JBQzVDLE9BQU87aUJBQ1Y7Z0JBRUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQzNDLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO29CQUMxQixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ3BDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDOUIsSUFBSSxLQUFLLENBQUMsS0FBSyxLQUFLLFVBQVUsRUFBRTt3QkFDNUIsTUFBTSxDQUFDLEtBQUssQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO3dCQUMxRCxTQUFTO3FCQUNaO3lCQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFO3dCQUN0QyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSwyQkFBMkIsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUM7d0JBQ2xFLFNBQVM7cUJBQ1o7b0JBRUQsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUNqQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxxQkFBcUIsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUM7aUJBQ2pFO1lBQ0wsQ0FBQyxFQUFFO2dCQUNDLE9BQU8sRUFBRSxpQkFBTyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxjQUFjLENBQUM7Z0JBQzdELE1BQU0sRUFBRSwrQkFBcUI7YUFDaEMsQ0FBQyxDQUFBO1NBQ1Q7S0FDSjtJQUVELElBQUksc0JBQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRTtRQUN4QyxxQkFBcUIsR0FBRyxpQkFBTyxDQUFDLFFBQVEsQ0FDcEMsc0JBQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFDeEMsNkNBQTZDLEVBQzdDLGdDQUFzQixDQUFDLFFBQVEsQ0FDbEMsQ0FBQztRQUVGLEtBQUssTUFBTSxLQUFLLElBQUksc0JBQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTtZQUN0RCxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDdEM7UUFFRCxJQUFJLHNCQUFNLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyw0QkFBNEIsRUFBRTtZQUM3RSxxQkFBcUI7aUJBQ2hCLFFBQVEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNqRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtvQkFDMUIsTUFBTSxNQUFNLEdBQUcsSUFBQSxtQ0FBYyxFQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQy9ELE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxNQUFNLENBQUMsT0FBTyxFQUFFLGdCQUFnQixNQUFNLGdCQUFnQixDQUFDLENBQUM7aUJBQy9FO1lBQ0wsQ0FBQyxFQUFFO2dCQUNDLE9BQU8sRUFBRSxpQkFBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxRQUFRLENBQUM7Z0JBQ2pELE1BQU0sRUFBRSwrQkFBcUI7Z0JBQzdCLE1BQU0sRUFBRSxvQkFBTzthQUNsQixDQUFDLENBQUE7U0FDVDtRQUVELElBQUksc0JBQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLGlDQUFpQyxFQUFFO1lBQ2xGLHFCQUFxQjtpQkFDaEIsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDakMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2pELEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO29CQUMxQixNQUFNLE1BQU0sR0FBRyxJQUFBLHdDQUFtQixFQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3BFLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxNQUFNLENBQUMsT0FBTyxFQUFFLGdCQUFnQixNQUFNLGdCQUFnQixDQUFDLENBQUM7aUJBQy9FO1lBQ0wsQ0FBQyxFQUFFO2dCQUNDLE9BQU8sRUFBRSxpQkFBTyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxXQUFXLENBQUM7Z0JBQ3ZELE1BQU0sRUFBRSwrQkFBcUI7Z0JBQzdCLE1BQU0sRUFBRSxvQkFBTzthQUNsQixDQUFDLENBQUE7U0FDVDtRQUVELElBQUksc0JBQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLCtCQUErQixFQUFFO1lBQ2hGLHFCQUFxQjtpQkFDaEIsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDakMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2pELEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO29CQUMxQixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQzlCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxNQUFNLENBQUMsT0FBTyxFQUFFLFlBQVksSUFBQSx3Q0FBbUIsRUFBQyxJQUFJLENBQUMsc0JBQXNCLElBQUEsdUNBQWtCLEVBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7aUJBQzVJO1lBQ0wsQ0FBQyxFQUFFO2dCQUNDLE9BQU8sRUFBRSxpQkFBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxRQUFRLENBQUM7Z0JBQ2pELE1BQU0sRUFBRSwrQkFBcUI7YUFDaEMsQ0FBQyxDQUFBO1NBQ1Q7S0FDSjtJQUVELElBQUksc0JBQU0sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRTtRQUMxQyxlQUFlLEdBQUcsaUJBQU8sQ0FBQyxRQUFRLENBQzlCLHNCQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQzFDLGdDQUFnQyxDQUNuQyxDQUFDO1FBRUYsS0FBSyxNQUFNLEtBQUssSUFBSSxzQkFBTSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFO1lBQ3hELGVBQWUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDaEM7UUFFRCxJQUFJLHNCQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQywyQkFBMkIsRUFBRTtZQUM5RSxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDNUMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUU7b0JBQ3ZDLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0NBQXNDLENBQUMsQ0FBQztvQkFDckQsT0FBTztpQkFDVjtnQkFFRCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzlCLElBQUEsb0NBQXlCLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtTQUNUO1FBRUQsSUFBSSxzQkFBTSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsc0NBQXNDLEVBQUU7WUFDekYsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ2hELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFO29CQUN2QyxNQUFNLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7b0JBQ3JELE9BQU87aUJBQ1Y7Z0JBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUU5QixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDakQsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtvQkFDcEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO29CQUNuRCxPQUFPO2lCQUNWO3FCQUFNLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7b0JBQzdCLE1BQU0sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQztvQkFDNUMsT0FBTztpQkFDVjtnQkFFRCxJQUFBLG9DQUF5QixFQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUMxRCxDQUFDLEVBQUU7Z0JBQ0MsTUFBTSxFQUFFLCtCQUFxQjthQUNoQyxDQUFDLENBQUM7U0FDTjtLQUNKO0lBRUQsSUFBSSxzQkFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFO1FBQ3hDLGFBQWEsR0FBRyxpQkFBTyxDQUFDLFFBQVEsQ0FBQyxzQkFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLGlDQUFpQyxFQUFFLGdDQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRS9JLEtBQUssTUFBTSxLQUFLLElBQUksc0JBQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTtZQUN0RCxhQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzlCO1FBRUQsSUFBSSxzQkFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsNkJBQTZCLEVBQUU7WUFDOUUsYUFBYTtpQkFDUixRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUM3QixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2xDLElBQUksTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRTtvQkFDdkMsTUFBTSxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO29CQUNyRCxPQUFPO2lCQUNWO2dCQUVELElBQUEsOEJBQWMsRUFBQyxNQUFNLENBQUMsQ0FBQztZQUMzQixDQUFDLEVBQUU7Z0JBQ0MsT0FBTyxFQUFFLGlCQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7YUFDaEQsQ0FBQyxDQUFBO1NBQ1Q7S0FDSjtBQUNMLENBQUMsQ0FBQyxDQUFBO0FBRUYsU0FBUyxhQUFhLENBQUMsSUFBWTtJQUMvQixNQUFNLE1BQU0sR0FBRyx3QkFBYSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekQsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO1FBQ2pCLE9BQU87S0FDVjtJQUVELE1BQU0sU0FBUyxHQUFhLEVBQUUsQ0FBQztJQUMvQixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFFbkIsSUFBSSxzQkFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsaUNBQWlDLEVBQUU7UUFDakYsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLGlCQUFVLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO1FBQ3RELFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDNUI7SUFFRCxJQUFJLHNCQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyx5QkFBeUIsRUFBRTtRQUN6RSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksaUJBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQzdDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDNUI7SUFFRCxJQUFJLHNCQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyx5QkFBeUIsRUFBRTtRQUN6RSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksaUJBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQzdDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDNUI7SUFFRCxJQUFJLHNCQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRTtRQUN0RSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksaUJBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDL0MsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUMxQjtJQUVELE1BQU0sSUFBSSxHQUFHLElBQUksaUJBQVUsQ0FBQyxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUUvRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDaEQsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLFNBQVMsSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDbEQsT0FBTztTQUNWO1FBRUQsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVwQyxRQUFRLEVBQUUsRUFBRTtZQUNSLEtBQUssUUFBUTtnQkFDVCxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRXZDLElBQUksWUFBWSxLQUFLLGlCQUFpQixDQUFDLE9BQU8sRUFBRTtvQkFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO2lCQUNwRDtxQkFBTTtvQkFDSCxNQUFNLENBQUMsV0FBVyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7aUJBQ3pEO2dCQUNELE1BQU07WUFDVixLQUFLLFFBQVE7Z0JBQ1QsTUFBTSxLQUFLLEdBQUcsSUFBQSxnQ0FBZSxFQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNwQyxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7b0JBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQztvQkFDaEQsT0FBTztpQkFDVjtnQkFDRCxNQUFNLFlBQVksR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUM7Z0JBQ3pGLElBQUksWUFBWSxLQUFLLHFCQUFxQixDQUFDLE9BQU8sRUFBRTtvQkFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsS0FBSyxDQUFDLFdBQVcsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO2lCQUNsRjtxQkFBTTtvQkFDSCxNQUFNLENBQUMsV0FBVyxDQUFDLG9EQUFvRCxDQUFDLENBQUM7aUJBQzVFO2dCQUNELE1BQU07WUFDVixLQUFLLFFBQVE7Z0JBQ1QsTUFBTSxDQUFDLFdBQVcsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNO1lBQ1YsS0FBSyxNQUFNO2dCQUNQLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdkIsTUFBTTtTQUNiO0lBRUwsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBRUQsSUFBSyxpQkFHSjtBQUhELFdBQUssaUJBQWlCO0lBQ2xCLCtEQUFPLENBQUE7SUFDUCx1RUFBVyxDQUFBO0FBQ2YsQ0FBQyxFQUhJLGlCQUFpQixLQUFqQixpQkFBaUIsUUFHckI7QUFDRCxTQUFTLFdBQVcsQ0FBQyxJQUFZO0lBQzdCLE1BQU0sT0FBTyxHQUFHLElBQUEsOEJBQWUsRUFBQyxJQUFJLENBQUMsQ0FBQztJQUV0QyxJQUFJLE9BQU8sS0FBSyxTQUFTLEVBQUU7UUFDdkIsT0FBTyxpQkFBaUIsQ0FBQyxXQUFXLENBQUM7S0FDeEM7SUFFRCxJQUFBLDBCQUFXLEVBQUMsSUFBSSxDQUFDLENBQUM7SUFFbEIsT0FBTyxpQkFBaUIsQ0FBQyxPQUFPLENBQUM7QUFDckMsQ0FBQztBQUVELElBQUsscUJBR0o7QUFIRCxXQUFLLHFCQUFxQjtJQUN0Qix1RUFBTyxDQUFBO0lBQ1AsdUdBQXVCLENBQUE7QUFDM0IsQ0FBQyxFQUhJLHFCQUFxQixLQUFyQixxQkFBcUIsUUFHekI7QUFFRCxTQUFTLGtCQUFrQixDQUFDLElBQVksRUFBRSxLQUFZLEVBQUUsZUFBdUM7SUFDM0YsSUFBSSxLQUFLLENBQUMsS0FBSyxLQUFLLElBQUksSUFBSSxlQUFlLEtBQUssZ0NBQXNCLENBQUMsTUFBTSxFQUFFO1FBQzNFLE9BQU8scUJBQXFCLENBQUMsdUJBQXVCLENBQUM7S0FDeEQ7SUFFRCxJQUFBLG1CQUFXLEVBQUMsS0FBSyxDQUFDLENBQUM7SUFFbkIsT0FBTyxxQkFBcUIsQ0FBQyxPQUFPLENBQUM7QUFDekMsQ0FBQztBQUVELFNBQVMsMEJBQTBCLENBQUMsSUFBWTtJQUM1QyxNQUFNLFNBQVMsR0FBRyxJQUFBLHVDQUFrQixFQUFDLElBQUksQ0FBQyxDQUFDO0lBQzNDLE1BQU0sU0FBUyxHQUFHLElBQUEsd0NBQW1CLEVBQUMsSUFBSSxDQUFDLENBQUM7SUFFNUMsT0FBTyxnQkFBZ0IsU0FBUywyQkFBMkIsU0FBUyxLQUFLLENBQUM7QUFDOUUsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLE1BQW9CO0lBQ3hDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM5QixNQUFNLGVBQWUsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUN2QixJQUFJLGVBQWUsS0FBSyxTQUFTLElBQUksR0FBRyxHQUFHLGVBQWUsSUFBSSxzQkFBTSxDQUFDLGdCQUFnQixFQUFFO1FBQ25GLE1BQU0sQ0FBQyxXQUFXLENBQUMsc0JBQXNCLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxzQkFBTSxDQUFDLGdCQUFnQixHQUFHLENBQUMsR0FBRyxHQUFHLGVBQWUsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLENBQUM7UUFDNUosT0FBTztLQUNWO0lBRUQsTUFBTSxRQUFRLEdBQUcsSUFBQSxrQkFBVSxHQUFFLENBQUM7SUFDOUIsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0QsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNULE1BQU0sQ0FBQyxXQUFXLENBQUMsbUVBQW1FLENBQUMsQ0FBQztRQUN4RixPQUFPO0tBQ1Y7SUFFRCxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUE7SUFFdEIsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFFL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQzlDLENBQUMifQ==