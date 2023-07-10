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
const storageManager_1 = require("./Storage/storageManager");
const claimPermissionManager_1 = require("./claims/claimPermissionManager");
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
                .overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }
                const xuid = player.getXuid();
                const res = (0, claimBuilder_1.cancelClaim)(xuid);
                if (res === claimBuilder_1.CancelClaimResult.Success) {
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
                .overload((_p, origin, output) => {
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
                .overload((_p, origin, output) => {
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
                    !(0, claim_1.playerHasPerms)(claim, xuid, "edit_members")) {
                    output.error('You dont have permission to add players to this claim!');
                    return;
                }
                const targets = params.target.newResults(origin);
                if (targets.length === 0) {
                    output.error('No targets matched selector');
                    return;
                }
                for (const target of targets) {
                    const targetXuid = target.getXuid();
                    const res = addPlayerToClaim(claim, targetXuid);
                    const claimName = claim.getName();
                    switch (res) {
                        case AddPlayerResult.Success:
                            output.success(`§e${target.getName()} is now a member of ${claimName}!`);
                            break;
                        case AddPlayerResult.AlreadyMember:
                            output.error(`${target.getName()} is already a member of ${claimName}!`);
                            break;
                    }
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
                    !(0, claim_1.playerHasPerms)(claim, xuid, "edit_members")) {
                    output.error('You dont have permission to remove players from this claim!');
                    return;
                }
                const targets = params.target.newResults(origin);
                if (targets.length === 0) {
                    output.error('No targets matched selector');
                    return;
                }
                for (const target of targets) {
                    const targetXuid = target.getXuid();
                    const res = removePlayerFromClaim(claim, targetXuid);
                    const claimName = claim.getName();
                    switch (res) {
                        case RemovePlayerResult.Success:
                            output.success(`§e${target.getName()}§a is no longer a member of §e${claimName}`);
                            break;
                        case RemovePlayerResult.NotAMember:
                            output.error(`${target.getName()} is not a member of ${claimName}!`);
                            break;
                        case RemovePlayerResult.CantRemoveOwner:
                            output.error('You cant remove the owner from a claim!');
                            break;
                    }
                }
            }, {
                options: command_1.command.enum('options.removeplayer', 'removeplayer'),
                target: command_2.PlayerCommandSelector,
            });
        }
        if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.setClaimNameCommandEnabled) {
            claimCommand
                .overload((params, origin, output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error("Command needs to be ran by a player!");
                    return;
                }
                const claim = (0, claim_1.getClaimAtPos)(player.getPosition(), player.getDimensionId());
                if (claim === undefined) {
                    output.error("You are not in a claim!");
                    return;
                }
                const xuid = player.getXuid();
                if (claim.owner !== xuid &&
                    player.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Normal) {
                    output.error("You don't have permission to set the name in that claim!");
                }
                let trimmedName = params.name.trim();
                if (trimmedName === "") {
                    output.error("Name cant be blank!");
                    return;
                }
                claim.setName(trimmedName);
                output.success(`§aSet claim name to §e${trimmedName}§a!`);
            }, {
                options: command_1.command.enum('options.setname', 'setname'),
                name: nativetype_1.CxxString,
            });
        }
        if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.managedMergedClaimsCommandEnabled) {
            claimCommand
                .overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error("Command need to be ran by a player!");
                    return;
                }
                openClaimMergeOptionsForm(player);
            }, {
                options: command_1.command.enum('options.group', 'group'),
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
        if (configManager_1.CONFIG.commandOptions.fclaim.subcommandOptions.serverClaimCreationModeToggleCommandEnabled) {
            moderatorClaimCommand
                .overload((params, origin, output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error("Command needs to be ran by a player!");
                    return;
                }
                const xuid = player.getXuid();
                let newState;
                if (params.enabled !== undefined) {
                    newState = params.enabled;
                }
                else {
                    newState = !(0, claimBuilder_1.isPlayerServerBuilder)(xuid);
                }
                switch ((0, claimBuilder_1.setPlayerServerBuilderState)(xuid, newState)) {
                    case claimBuilder_1.PlayerServerBuilderToggleResult.Success: {
                        const message = newState ? "§aYou are now a server builder!" : "§aYou are no longer a server builder!";
                        output.success(message);
                        break;
                    }
                    case claimBuilder_1.PlayerServerBuilderToggleResult.AlreadyNotBuilder: {
                        output.error("You are already not a server builder!");
                        break;
                    }
                    case claimBuilder_1.PlayerServerBuilderToggleResult.AlreadyBuilder: {
                        output.error("You are already a server builder!");
                        break;
                    }
                    case claimBuilder_1.PlayerServerBuilderToggleResult.AlreadyBuildingClaim: {
                        output.error("You cant toggle your server builder state while already building a claim!");
                        break;
                    }
                }
            }, {
                options: command_1.command.enum('options.sclaimbuildertoggle', 'sclaimbuildertoggle'),
                enabled: [nativetype_1.bool_t, true],
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
    if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.addPlayerCommandEnabled) {
        buttons.push(new form_1.FormButton('Add Player To Claim'));
        buttonIds.push('addplayer');
    }
    if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.removePlayerCommandEnabled) {
        buttons.push(new form_1.FormButton('Remove Player From Claim'));
        buttonIds.push('removeplayer');
    }
    if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.setClaimNameCommandEnabled) {
        buttons.push(new form_1.FormButton('Set Claim Name'));
        buttonIds.push('setname');
    }
    if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.managedMergedClaimsCommandEnabled) {
        buttons.push(new form_1.FormButton('Manage Groups'));
        buttonIds.push('group');
    }
    const form = new form_1.SimpleForm('Claim Subcommands', 'Select an option:', buttons);
    form.sendTo(player.getNetworkIdentifier(), (form) => {
        if (form.response === undefined || isDecayed(player)) {
            return;
        }
        const id = buttonIds[form.response];
        const xuid = player.getXuid();
        let claim = undefined;
        switch (id) {
            case 'cancel':
                const cancelResult = (0, claimBuilder_1.cancelClaim)(xuid);
                if (cancelResult === claimBuilder_1.CancelClaimResult.Success) {
                    player.sendMessage('§aClaim creation canceled!');
                }
                else {
                    player.sendMessage('§cYou are not creating a claim!');
                }
                break;
            case 'delete':
                claim = (0, claimDetection_1.getCurrentClaim)(xuid);
                if (claim === undefined) {
                    player.sendMessage('§cYou are not in a claim!');
                    break;
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
            case 'addplayer':
                claim = (0, claim_1.getClaimAtPos)(player.getPosition(), player.getDimensionId());
                if (claim === undefined) {
                    player.sendMessage('§cYou are not in a claim!');
                    break;
                }
                let xuid2 = player.getXuid();
                if (claim.owner !== xuid2 && !(0, claim_1.playerHasPerms)(claim, xuid2, "edit_members") && player.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Normal) {
                    player.sendMessage('§cYou dont have permission to add players to this claim!');
                    break;
                }
                sendAndGetSearchPlayerForm(player).then((foundPlayers) => {
                    if (isDecayed(player)) {
                        return;
                    }
                    if (foundPlayers === undefined) {
                        player.sendMessage('§cNo players found!');
                        return;
                    }
                    sendSelectPlayerForm(player, foundPlayers).then((foundPlayer) => {
                        if (isDecayed(player) || foundPlayer === undefined) {
                            return;
                        }
                        if (isDecayed(foundPlayer)) {
                            player.sendMessage('§cThe selected player is no long online!');
                            return;
                        }
                        const claim = (0, claim_1.getClaimAtPos)(player.getPosition(), player.getDimensionId());
                        if (claim === undefined) {
                            player.sendMessage('§cYou are not in a claim!');
                            return;
                        }
                        const res = addPlayerToClaim(claim, foundPlayer.getXuid());
                        const claimName = claim.getName();
                        switch (res) {
                            case AddPlayerResult.Success:
                                player.sendMessage(`§e${foundPlayer.getName()}§a is now a member of §e${claimName}§a!`);
                                break;
                            case AddPlayerResult.AlreadyMember:
                                player.sendMessage(`§c${foundPlayer.getName()} is already a member of ${claimName}!`);
                                break;
                        }
                    });
                });
                break;
            case 'removeplayer':
                claim = (0, claim_1.getClaimAtPos)(player.getPosition(), player.getDimensionId());
                if (claim === undefined) {
                    player.sendMessage('§cYou are not in a claim!');
                    return;
                }
                const xuid3 = player.getXuid();
                if (claim.owner !== xuid3 || (0, claim_1.playerHasPerms)(claim, xuid3, "edit_members") && player.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Normal) {
                    player.sendMessage('§cYou dont have permission to remove players from this claim!');
                    return;
                }
                let memberXuids = claim.getMemberXuids();
                const memberNames = [];
                const indexesToRemove = [];
                for (let i = 0; i < memberXuids.length; i++) {
                    const xuid3 = memberXuids[i];
                    const name = (0, storageManager_1.getName)(xuid3);
                    if (name === undefined) {
                        indexesToRemove.push(i);
                    }
                    else {
                        memberNames.push(name);
                    }
                }
                for (const _ of indexesToRemove) {
                    memberXuids = memberXuids.filter((_v, i) => {
                        return !indexesToRemove.includes(i);
                    });
                }
                sendSelectPlayerNameForm(player, memberXuids, memberNames).then((xuid) => {
                    if (isDecayed(player) || xuid === undefined) {
                        return;
                    }
                    const claim = (0, claim_1.getClaimAtPos)(player.getPosition(), player.getDimensionId());
                    if (claim === undefined) {
                        player.sendMessage('§cYou are not in a claim!');
                        return;
                    }
                    const name = (0, storageManager_1.getName)(xuid);
                    const res = removePlayerFromClaim(claim, xuid);
                    const claimName = claim.getName();
                    switch (res) {
                        case RemovePlayerResult.Success:
                            player.sendMessage(`§aRemoved §e${name}§a from §e${claimName}`);
                            break;
                        case RemovePlayerResult.CantRemoveOwner:
                            player.sendMessage('§cYou cant remove the owner from their own claim!');
                            break;
                        case RemovePlayerResult.NotAMember:
                            player.sendMessage(`§e${name} isn't a member of that claim!`);
                    }
                });
                break;
            case 'setname':
                sendClaimNameInputForm(player).then(undefined, (reason) => {
                    if (isDecayed(player)) {
                        return;
                    }
                    switch (reason) {
                        case SendClaimNameFormFailReason.NoClaim: {
                            player.sendMessage("§cYou are not in a claim!");
                            break;
                        }
                        case SendClaimNameFormFailReason.NoPermission: {
                            player.sendMessage("§cYou don't have permission to set the name in this claim!");
                            break;
                        }
                        case SendClaimNameFormFailReason.BlankName: {
                            player.sendMessage("§cName can't be blank!");
                            break;
                        }
                    }
                });
                break;
            case 'group':
                openClaimMergeOptionsForm(player);
        }
    });
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
var AddPlayerResult;
(function (AddPlayerResult) {
    AddPlayerResult[AddPlayerResult["Success"] = 0] = "Success";
    AddPlayerResult[AddPlayerResult["AlreadyMember"] = 1] = "AlreadyMember";
})(AddPlayerResult || (AddPlayerResult = {}));
function addPlayerToClaim(claim, playerXuid) {
    const members = claim.getMemberXuids();
    if (claim.owner === playerXuid || members.includes(playerXuid)) {
        return AddPlayerResult.AlreadyMember;
    }
    claim.setMemberPermissions(playerXuid, (0, claimPermissionManager_1.createDefaultClaimPermission)());
    (0, storageManager_1.saveData)();
    return AddPlayerResult.Success;
}
var RemovePlayerResult;
(function (RemovePlayerResult) {
    RemovePlayerResult[RemovePlayerResult["Success"] = 0] = "Success";
    RemovePlayerResult[RemovePlayerResult["NotAMember"] = 1] = "NotAMember";
    RemovePlayerResult[RemovePlayerResult["CantRemoveOwner"] = 2] = "CantRemoveOwner";
})(RemovePlayerResult || (RemovePlayerResult = {}));
function removePlayerFromClaim(claim, playerXuid) {
    const members = claim.getMemberXuids();
    if (claim.owner === playerXuid) {
        return RemovePlayerResult.CantRemoveOwner;
    }
    if (!members.includes(playerXuid)) {
        return RemovePlayerResult.NotAMember;
    }
    claim.removeMember(playerXuid);
    return RemovePlayerResult.Success;
}
async function sendAndGetSearchPlayerForm(player) {
    const form = new form_1.CustomForm("Search for Player", [
        new form_1.FormInput('Enter player name:'),
        new form_1.FormLabel('Match Case:'),
        new form_1.FormToggle('', false),
        new form_1.FormLabel('Exact Name:'),
        new form_1.FormToggle('', false), // 4
    ]);
    return new Promise((resolve) => {
        form.sendTo(player.getNetworkIdentifier(), (res) => {
            if (res.response === null || isDecayed(player)) {
                resolve(undefined);
                return;
            }
            let searchedName = res.response[0];
            if (!res.response[2]) {
                searchedName = searchedName.toLowerCase();
            }
            const players = launcher_1.bedrockServer.level.getPlayers();
            resolve(players.filter((value) => {
                let foundName = value.getName();
                if (!res.response[2]) { // Match Case
                    foundName = foundName.toLowerCase();
                }
                if (res.response[4]) { // Exact Name
                    return foundName === searchedName;
                }
                else {
                    return foundName.includes(searchedName);
                }
            }));
        });
    });
}
async function sendSelectPlayerForm(player, playerList) {
    const buttons = [];
    for (const player of playerList) {
        buttons.push(new form_1.FormButton(player.getName(), "url", "https://i.imgur.com/t699Gf6.jpg"));
    }
    const form = new form_1.SimpleForm('Select a Player', '', buttons);
    return new Promise((resolve) => {
        form.sendTo(player.getNetworkIdentifier(), (res) => {
            if (res.response === null || isDecayed(player)) {
                resolve(undefined);
                return;
            }
            const selectedPlayer = playerList[res.response];
            if (isDecayed(selectedPlayer)) {
                resolve(undefined);
            }
            else {
                resolve(selectedPlayer);
            }
        });
    });
}
async function sendSelectPlayerNameForm(player, xuids, names) {
    const buttons = [];
    for (const name of names) {
        buttons.push(new form_1.FormButton(name, 'url', 'https://i.imgur.com/t699Gf6.jpg'));
    }
    const form = new form_1.SimpleForm('Select a Player', '', buttons);
    return new Promise((resolve) => {
        form.sendTo(player.getNetworkIdentifier(), (res) => {
            if (isDecayed(player) || res.response === null) {
                resolve(undefined);
                return;
            }
            const xuid = xuids[res.response];
            resolve(xuid);
        });
    });
}
var SendClaimNameFormFailReason;
(function (SendClaimNameFormFailReason) {
    SendClaimNameFormFailReason[SendClaimNameFormFailReason["Cancelled"] = 0] = "Cancelled";
    SendClaimNameFormFailReason[SendClaimNameFormFailReason["NoClaim"] = 1] = "NoClaim";
    SendClaimNameFormFailReason[SendClaimNameFormFailReason["NoPermission"] = 2] = "NoPermission";
    SendClaimNameFormFailReason[SendClaimNameFormFailReason["BlankName"] = 3] = "BlankName";
})(SendClaimNameFormFailReason || (SendClaimNameFormFailReason = {}));
async function sendClaimNameInputForm(player) {
    const claim = (0, claim_1.getClaimAtPos)(player.getPosition(), player.getDimensionId());
    if (claim === undefined) {
        throw SendClaimNameFormFailReason.NoClaim;
    }
    const xuid = player.getXuid();
    if (claim.owner !== xuid &&
        player.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Normal &&
        (0, claim_1.playerHasPerms)(claim, xuid, "edit_name")) {
        throw SendClaimNameFormFailReason.NoPermission;
    }
    const isModifyingGroup = claim.tryGetGroup() !== undefined;
    const namingType = isModifyingGroup ? "Group" : "Claim";
    let inputName;
    try {
        inputName = await sendTextInputForm(player, `${namingType} Name`, `Enter the ${namingType} name:`, claim.getName());
    }
    catch (_a) {
        throw SendClaimNameFormFailReason.Cancelled;
    }
    const trimmedInput = inputName.trim();
    if (trimmedInput === "") {
        throw SendClaimNameFormFailReason.BlankName;
    }
    claim.setName(trimmedInput);
    player.sendMessage(`The ${namingType} has been renamed to ${trimmedInput}`);
    return trimmedInput;
}
function openClaimMergeOptionsForm(player) {
    const playerXuid = player.getXuid();
    const isServer = (0, claimBuilder_1.isPlayerServerBuilder)(playerXuid);
    const ownerXuid = isServer ? "SERVER" : playerXuid;
    const form = new form_1.SimpleForm(`${isServer ? "Server " : ""}Group Options`, "Select an option:", [
        new form_1.FormButton(`Edit Existing Group`),
        new form_1.FormButton("Create New Group"),
        new form_1.FormButton("Delete Group"),
    ]);
    form.sendTo(player.getNetworkIdentifier(), async (data) => {
        if (data.response === null || isDecayed(player)) {
            return;
        }
        let selectedGroup;
        let ownedGroups;
        switch (data.response) {
            case 0: // Edit existing group
                ownedGroups = (0, claim_1.getOwnedGroups)(ownerXuid);
                if (ownedGroups.length === 0) {
                    player.sendMessage("You don't have any groups!");
                    return;
                }
                try {
                    selectedGroup = await sendSelectGroupForm(player, ownedGroups);
                }
                catch (_a) {
                    return;
                }
                sendEditGroupFrom(player, selectedGroup, isServer);
                break;
            case 1: // Create new Group
                let groupName;
                try {
                    groupName = await sendTextInputForm(player, "Group Name Setter", "Enter the name for the group", `${player.getName()}'s Group`);
                }
                catch (_b) {
                    return;
                }
                ownedGroups = (0, claim_1.getOwnedGroups)(ownerXuid);
                if (ownedGroups !== undefined) {
                    for (const group of ownedGroups) {
                        if (group.groupName === groupName) {
                            player.sendMessage(`§c${!isServer ? "You already have" : "The Server already has"} a group with that name!`);
                            return;
                        }
                    }
                }
                (0, claim_1.createGroup)(groupName, ownerXuid).then(() => {
                    player.sendMessage(`§aCreated a group with the name §e${groupName}§a!`);
                });
                break;
            case 2: // Delete group
                let isRemovingGroup = true;
                while (isRemovingGroup) {
                    ownedGroups = (0, claim_1.getOwnedGroups)(ownerXuid);
                    if (ownedGroups.length === 0) {
                        player.sendMessage("§cYou have no Groups!");
                        isRemovingGroup = false;
                        continue;
                    }
                    try {
                        selectedGroup = await sendSelectGroupForm(player, ownedGroups);
                    }
                    catch (_c) {
                        isRemovingGroup = false;
                        continue;
                    }
                    try {
                        (0, claim_1.deleteClaimGroup)(selectedGroup);
                        player.sendMessage("§aGroup deleted!");
                    }
                    catch (_d) {
                        player.sendMessage("§cGroup already deleted!");
                    }
                    if (ownedGroups.length === 1) {
                        isRemovingGroup = false;
                    }
                    else {
                        try {
                            isRemovingGroup = await sendYesNoForm(player, "Remove Another?", "Do you want to remove another Group?");
                        }
                        catch (_e) {
                            isRemovingGroup = false;
                        }
                    }
                }
                break;
        }
    });
}
async function sendSelectGroupForm(player, groups) {
    const buttons = [];
    for (const group of groups) {
        buttons.push(new form_1.FormButton(group.groupName));
    }
    const form = new form_1.SimpleForm("Group List", "Select the group you want:", buttons);
    return new Promise((resolve, reject) => {
        form.sendTo(player.getNetworkIdentifier(), (data) => {
            if (data.response === null || isDecayed(player)) {
                reject();
            }
            resolve(groups[data.response]);
        });
    });
}
function sendEditGroupFrom(player, group, isServer) {
    const form = new form_1.SimpleForm("Group Options", "Select an option:", [
        new form_1.FormButton("Add Claim to Group"),
        new form_1.FormButton("Remove Claim from Group"),
        new form_1.FormButton("Edit Existing Claim"),
    ]);
    form.sendTo(player.getNetworkIdentifier(), async (data) => {
        if (data.response === null || isDecayed(player)) {
            return;
        }
        const xuid = isServer ? "SERVER" : player.getXuid();
        let claim;
        let groupedClaims;
        switch (data.response) {
            case 0:
                let isAddingAnother = true;
                let isFirstLoop = true;
                while (isAddingAnother) {
                    const allNonGroupedClaims = getClaimsNotInGroup(xuid);
                    if (allNonGroupedClaims.length === 0) {
                        player.sendMessage(`§cYou have no ${isFirstLoop ? "" : "more "}claims to add!`);
                        isAddingAnother = false;
                        continue;
                    }
                    isFirstLoop = false;
                    try {
                        claim = await sendSelectClaimForm(player, allNonGroupedClaims);
                    }
                    catch (_a) {
                        isAddingAnother = false;
                        continue;
                    }
                    group.addClaim(claim);
                    player.sendMessage(`§e${claim.getName(true)}§a added to the group!`);
                    if (allNonGroupedClaims.length === 1) {
                        isAddingAnother = false;
                        continue;
                    }
                    try {
                        isAddingAnother = await sendYesNoForm(player, "Add Another?", "Do you want to add another claim?");
                    }
                    catch (_b) {
                        isAddingAnother = false;
                    }
                }
                break;
            case 1:
                let isRemovingAnother = true;
                while (isRemovingAnother) {
                    groupedClaims = group.getClaims();
                    if (groupedClaims.length === 0) {
                        player.sendMessage("§cThere are no claims in this group!");
                        isRemovingAnother = false;
                        continue;
                    }
                    try {
                        claim = await sendSelectClaimForm(player, groupedClaims);
                    }
                    catch (_c) {
                        isRemovingAnother = false;
                        continue;
                    }
                    let didRemove = false;
                    const newClaimGroupIds = group.claimIds.filter((value) => {
                        let willRemove = value === claim.id;
                        if (willRemove) {
                            didRemove = true;
                        }
                        return !willRemove;
                    });
                    if (!didRemove) {
                        player.sendMessage("§cThat claim isn't in the group!");
                    }
                    else {
                        group.claimIds = newClaimGroupIds;
                        player.sendMessage(`§e${claim.getName(true)}§a removed from the group!`);
                    }
                    if (groupedClaims.length === 1) {
                        isRemovingAnother = false;
                    }
                    else {
                        try {
                            isRemovingAnother = await sendYesNoForm(player, "Remove Another?", "Remove another claim?");
                        }
                        catch (_d) {
                            isRemovingAnother = false;
                        }
                    }
                }
                break;
            case 2:
                groupedClaims = group.getClaims();
                if (groupedClaims.length === 0) {
                    player.sendMessage("§cThere are no claims linked to this Group!");
                    return;
                }
                try {
                    claim = await sendSelectClaimForm(player, groupedClaims);
                }
                catch (_e) {
                    return;
                }
                sendEditClaimForm(player, claim);
                break;
        }
    });
}
async function sendSelectClaimForm(player, claimList, title = "Claim List", description = "Select a claim") {
    const buttons = [];
    for (const claim of claimList) {
        buttons.push(new form_1.FormButton(claim.getName(true)));
    }
    const form = new form_1.SimpleForm(title, description, buttons);
    return new Promise((resolve, reject) => {
        form.sendTo(player.getNetworkIdentifier(), (data) => {
            if (data.response === null || isDecayed(player)) {
                reject();
            }
            resolve(claimList[data.response]);
        });
    });
}
async function sendTextInputForm(player, title, description, defaultName) {
    return new Promise((resolve, reject) => {
        const form = new form_1.CustomForm(title, [
            new form_1.FormInput(description, defaultName, defaultName),
        ]);
        form.sendTo(player.getNetworkIdentifier(), (res) => {
            if (res.response === null || isDecayed(player)) {
                reject();
                return;
            }
            resolve(res.response[0]);
        });
    });
}
function sendEditClaimForm(player, claim) {
    const form = new form_1.SimpleForm("Claim Configuration", "Select an option:", [
        new form_1.FormButton("Edit Name"),
    ]);
    form.sendTo(player.getNetworkIdentifier(), async (data) => {
        if (data.response === null || isDecayed(player)) {
            return;
        }
        switch (data.response) {
            case 0:
                let selectedName = await sendTextInputForm(player, "Claim Name", 'Enter the claim name:', claim.getName(true));
                let trimmedName = selectedName.trim();
                if (trimmedName === "") {
                    player.sendMessage("§cName can't be blank!");
                    return;
                }
                claim.setName(trimmedName, true);
                player.sendMessage(`§aRenamed claim in group to §e${trimmedName}§a!`);
                break;
        }
    });
}
function getClaimsNotInGroup(playerXuid) {
    const claims = [];
    const ownedClaims = (0, claim_1.getOwnedClaims)(playerXuid);
    for (const claim of ownedClaims) {
        if (claim.tryGetGroup() === undefined) {
            claims.push(claim);
        }
    }
    return claims;
}
async function sendYesNoForm(player, title, description) {
    const form = new form_1.ModalForm(title, description);
    form.setButtonCancel("No");
    form.setButtonConfirm("Yes");
    return new Promise((resolve, reject) => {
        form.sendTo(player.getNetworkIdentifier(), (data) => {
            if (isDecayed(player)) {
                reject();
                return;
            }
            resolve(data.response === true);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNDQUFrQztBQUNsQywwQ0FBMkQ7QUFDM0QsbURBQXVEO0FBQ3ZELHdEQU0rQjtBQUMvQixvRUFLcUM7QUFDckMsMENBUXdCO0FBQ3hCLDhDQUErRTtBQUMvRSxnREFBMkQ7QUFDM0QsbUNBQW1DO0FBQ25DLHdEQUFvRTtBQUNwRSw0Q0FBNEM7QUFDNUMsd0NBQThHO0FBQzlHLHNDQUFpQztBQUNqQyw0REFBd0Q7QUFFeEQsNkRBQTJEO0FBQzNELDRFQUE2RTtBQUM3RSxJQUFPLFNBQVMsR0FBRyxhQUFLLENBQUMsU0FBUyxDQUFDO0FBRW5DLElBQUksWUFBWSxHQUFxQyxTQUFTLENBQUM7QUFDL0QsSUFBSSxxQkFBcUIsR0FBcUMsU0FBUyxDQUFDO0FBQ3hFLElBQUksZUFBZSxHQUFxQyxTQUFTLENBQUM7QUFDbEUsSUFBSSxhQUFhLEdBQXFDLFNBQVMsQ0FBQztBQUVoRSxNQUFNLGVBQWUsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUV2RCxjQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUU7SUFDdEIseUJBQXlCO0lBQ3pCLElBQUksc0JBQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRTtRQUN2QyxZQUFZLEdBQUcsaUJBQU8sQ0FBQyxRQUFRLENBQUMsc0JBQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO1FBRXpHLEtBQUssTUFBTSxLQUFLLElBQUksc0JBQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRTtZQUNyRCxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzdCO1FBRUQsSUFBSSxzQkFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUU7WUFDOUMs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