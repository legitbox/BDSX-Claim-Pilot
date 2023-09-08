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
        if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.editClaimCommandEnabled) {
            claimCommand
                .overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error("Command needs to be ran by a player!");
                    return;
                }
                const claim = (0, claimDetection_1.getCurrentClaim)(player.getXuid());
                if (claim === undefined) {
                    output.error("You are not in a claim!");
                    return;
                }
                sendEditClaimForm(player, claim);
            }, {
                options: command_1.command.enum('options.edit', 'edit')
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
    const buttons = [];
    const xuid = player.getXuid();
    if ((0, claim_1.playerHasPerms)(claim, xuid, "edit_members")) {
        buttons.push(new form_1.FormButton("Edit Members"));
    }
    if ((0, claim_1.playerHasPerms)(claim, xuid, "edit_name")) {
        buttons.push(new form_1.FormButton("Edit Name"));
    }
    if (buttons.length === 0) {
        player.sendMessage("§cYou dont have permission to modify anything in this claim!");
        return;
    }
    const form = new form_1.SimpleForm("Claim Configuration", "Select an option:", [
        new form_1.FormButton("Edit Name"),
        new form_1.FormButton("Edit Members"),
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
            case 1:
                const xuids = claim.getMemberXuids();
                const names = [];
                for (const xuid of xuids) {
                    const name = (0, storageManager_1.getName)(xuid);
                    if (name === undefined) {
                        // Player name not stored anymore! Removing from claim since they cant be displayed otherwise.
                        removePlayerFromClaim(claim, xuid);
                        continue;
                    }
                    names.push(name);
                }
                if (names.length === 0) {
                    player.sendMessage(`§cThis claim has no members!`);
                    return;
                }
                const xuid = await sendSelectPlayerNameForm(player, xuids, names);
                if (xuid === undefined) {
                    // No name was selected
                    return;
                }
                sendEditMemberForm(player, claim, xuid);
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
function sendEditMemberForm(player, claim, memberXuid) {
    const form = new form_1.SimpleForm(`Edit ${player.getName()}`, "Select an option", [
        new form_1.FormButton('Remove Player'),
        new form_1.FormButton('Edit Permissions'),
    ]);
    form.sendTo(player.getNetworkIdentifier(), (data) => {
        if (data.response === undefined || isDecayed(player)) {
            return;
        }
        let name = (0, storageManager_1.getName)(memberXuid);
        switch (data.response) {
            case 0:
                const isSure = sendYesNoForm(player, "CONFIRMATION", `Are you sure you want to remove ${name}?`);
                if (!isSure) {
                    return;
                }
                removePlayerFromClaim(claim, memberXuid);
                player.sendMessage(`Removed ${name} from the claim!`);
                break;
            case 1:
                sendEditMemberPermsForm(player, claim, memberXuid);
        }
    });
}
function sendEditMemberPermsForm(player, claim, memberXuid) {
    let perms = claim.getMemberPermissions(memberXuid);
    const permDatas = (0, claimPermissionManager_1.getClaimPermissionDatas)();
    const formToggles = [];
    for (const permData of permDatas) {
        let currentValue = perms === null || perms === void 0 ? void 0 : perms.get(permData.permissionName);
        if (currentValue === undefined) {
            currentValue = permData.defaultValue;
        }
        formToggles.push(new form_1.FormToggle(permData.optionName, currentValue));
    }
    const name = (0, storageManager_1.getName)(memberXuid);
    const form = new form_1.CustomForm(`Edit ${name}'s permissions`, formToggles);
    form.sendTo(player.getNetworkIdentifier(), (data) => {
        if (data.response === undefined || isDecayed(player)) {
            return;
        }
        const newPermMap = new Map();
        for (let i = 0; i < data.response; i++) {
            const permData = permDatas[i];
            newPermMap.set(permData.permissionName, data.response[i]);
        }
        claim.setMemberPermissions(memberXuid, newPermMap);
        (0, storageManager_1.saveData)();
        player.sendMessage("Updated permissions!");
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNDQUFrQztBQUNsQywwQ0FBMkQ7QUFDM0QsbURBQXVEO0FBQ3ZELHdEQU0rQjtBQUMvQixvRUFLcUM7QUFDckMsMENBUXdCO0FBQ3hCLDhDQUErRTtBQUMvRSxnREFBMkQ7QUFDM0QsbUNBQW1DO0FBQ25DLHdEQUFvRTtBQUNwRSw0Q0FBNEM7QUFDNUMsd0NBQThHO0FBQzlHLHNDQUFpQztBQUNqQyw0REFBd0Q7QUFFeEQsNkRBQTJEO0FBQzNELDRFQUd5QztBQUN6QyxJQUFPLFNBQVMsR0FBRyxhQUFLLENBQUMsU0FBUyxDQUFDO0FBRW5DLElBQUksWUFBWSxHQUFxQyxTQUFTLENBQUM7QUFDL0QsSUFBSSxxQkFBcUIsR0FBcUMsU0FBUyxDQUFDO0FBQ3hFLElBQUksZUFBZSxHQUFxQyxTQUFTLENBQUM7QUFDbEUsSUFBSSxhQUFhLEdBQXFDLFNBQVMsQ0FBQztBQUVoRSxNQUFNLGVBQWUsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUV2RCxjQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUU7SUFDdEIseUJBQXlCO0lBQ3pCLElBQUksc0JBQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRTtRQUN2QyxZQUFZLEdBQUcsaUJBQU8sQ0FBQyxRQUFRLENBQUMsc0JBQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO1FBRXpHLEtBQUssTUFBTSxLQUFLLElBQUksc0JBQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRTtZQUNyRCxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzdCO1FBRUQsSUFBSSxzQkFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUU7WUFDOUMs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