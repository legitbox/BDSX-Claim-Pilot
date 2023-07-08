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
    const form = new form_1.SimpleForm("Merge Options", "Select an option:", [
        new form_1.FormButton("Edit Existing Group"),
        new form_1.FormButton("Create New Group"),
        new form_1.FormButton("Delete Group"),
    ]);
    const playerXuid = player.getXuid();
    const isServer = (0, claimBuilder_1.isPlayerServerBuilder)(playerXuid);
    const ownerXuid = isServer ? "SERVER" : playerXuid;
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
                const nonGroupedClaims = getClaimsNotInGroup(ownerXuid);
                if (nonGroupedClaims.length === 0) {
                    player.sendMessage("There are no claims to create a group for!");
                    return;
                }
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
                const group = new claim_1.ClaimGroup((0, utils_1.generateID)(16), groupName, ownerXuid, [], {});
                (0, claim_1.registerClaimGroup)(group);
                player.sendMessage(`§aCreated a group with the name §e${groupName}§a!`);
                break;
            case 2: // Delete group
                let isRemovingGroup = true;
                while (isRemovingGroup) {
                    ownedGroups = (0, claim_1.getOwnedGroups)(ownerXuid);
                    if (ownedGroups === undefined) {
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
                    if (group.claimIds.includes(claim.id)) {
                        player.sendMessage("§cThat claim is already in the group!");
                        return;
                    }
                    group.claimIds.push(claim.id);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNDQUFrQztBQUNsQywwQ0FBMkQ7QUFDM0QsbURBQXVEO0FBQ3ZELHdEQU0rQjtBQUMvQixvRUFLcUM7QUFDckMsMENBUXdCO0FBQ3hCLDhDQUErRTtBQUMvRSxnREFBMkQ7QUFDM0QsbUNBQStDO0FBQy9DLHdEQUFvRTtBQUNwRSw0Q0FBNEM7QUFDNUMsd0NBQThHO0FBQzlHLHNDQUFpQztBQUNqQyw0REFBd0Q7QUFFeEQsNkRBQTJEO0FBQzNELDRFQUE2RTtBQUM3RSxJQUFPLFNBQVMsR0FBRyxhQUFLLENBQUMsU0FBUyxDQUFDO0FBRW5DLElBQUksWUFBWSxHQUFxQyxTQUFTLENBQUM7QUFDL0QsSUFBSSxxQkFBcUIsR0FBcUMsU0FBUyxDQUFDO0FBQ3hFLElBQUksZUFBZSxHQUFxQyxTQUFTLENBQUM7QUFDbEUsSUFBSSxhQUFhLEdBQXFDLFNBQVMsQ0FBQztBQUVoRSxNQUFNLGVBQWUsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUV2RCxjQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUU7SUFDdEIseUJBQXlCO0lBQ3pCLElBQUksc0JBQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRTtRQUN2QyxZQUFZLEdBQUcsaUJBQU8sQ0FBQyxRQUFRLENBQUMsc0JBQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO1FBRXpHLEtBQUssTUFBTSxLQUFLLElBQUksc0JBQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRTtZQUNyRCxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzdCO1FBRUQsSUFBSSxzQkFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUU7WUFDOUMs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