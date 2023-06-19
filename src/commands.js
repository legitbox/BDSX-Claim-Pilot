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
                for (const target of targets) {
                    const targetXuid = target.getXuid();
                    const res = addPlayerToClaim(claim, targetXuid);
                    switch (res) {
                        case AddPlayerResult.Success:
                            output.success(`§e${target.getName()} is now a member of ${claim.name}!`);
                            break;
                        case AddPlayerResult.AlreadyMember:
                            output.error(`${target.getName()} is already a member of ${claim.name}!`);
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
                    !(0, claim_1.playerHasPerms)(claim, xuid, claim_1.ClaimPermissionTypes.EditMembers)) {
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
                    switch (res) {
                        case RemovePlayerResult.Success:
                            output.success(`§e${target.getName()}§a is no longer a member of §e${claim.name}`);
                            break;
                        case RemovePlayerResult.NotAMember:
                            output.error(`${target.getName()} is not a member of ${claim.name}!`);
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
    if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.addPlayerCommandEnabled) {
        buttons.push(new form_1.FormButton('Add Player To Claim'));
        buttonIds.push('addplayer');
    }
    if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.removePlayerCommandEnabled) {
        buttons.push(new form_1.FormButton('Remove Player From Claim'));
        buttonIds.push('removeplayer');
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
                const cancelResult = cancelClaim(xuid);
                if (cancelResult === CancelClaimResult.Success) {
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
                if (claim.owner !== xuid2 && !(0, claim_1.playerHasPerms)(claim, xuid2, claim_1.ClaimPermissionTypes.EditMembers) && player.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Normal) {
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
                        switch (res) {
                            case AddPlayerResult.Success:
                                player.sendMessage(`§e${foundPlayer.getName()}§a is now a member of §e${claim.name}§a!`);
                                break;
                            case AddPlayerResult.AlreadyMember:
                                player.sendMessage(`§c${foundPlayer.getName()} is already a member of ${claim.name}!`);
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
                if (claim.owner !== xuid3 || (0, claim_1.playerHasPerms)(claim, xuid3, claim_1.ClaimPermissionTypes.EditMembers) && player.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Normal) {
                    player.sendMessage('§cYou dont have permission to remove players from this claim!');
                    return;
                }
                let memberXuids = Object.keys(claim.members);
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
                for (const index of indexesToRemove) {
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
                    switch (res) {
                        case RemovePlayerResult.Success:
                            player.sendMessage(`§aRemoved §e${name}§a from §e${claim.name}`);
                            break;
                        case RemovePlayerResult.CantRemoveOwner:
                            player.sendMessage('§cYou cant remove the owner from their own claim!');
                            break;
                        case RemovePlayerResult.NotAMember:
                            player.sendMessage(`§e${name} isn't a member of that claim!`);
                    }
                });
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
var AddPlayerResult;
(function (AddPlayerResult) {
    AddPlayerResult[AddPlayerResult["Success"] = 0] = "Success";
    AddPlayerResult[AddPlayerResult["AlreadyMember"] = 1] = "AlreadyMember";
})(AddPlayerResult || (AddPlayerResult = {}));
function addPlayerToClaim(claim, playerXuid) {
    const members = Object.keys(claim.members);
    if (claim.owner === playerXuid || members.includes(playerXuid)) {
        return AddPlayerResult.AlreadyMember;
    }
    claim.members[playerXuid] = (0, claim_1.createDefaultClaimPermission)();
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
    const members = Object.keys(claim.members);
    if (claim.owner === playerXuid) {
        return RemovePlayerResult.CantRemoveOwner;
    }
    if (!members.includes(playerXuid)) {
        return RemovePlayerResult.NotAMember;
    }
    delete claim.members[playerXuid];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHNDQUFrQztBQUNsQywwQ0FBMkQ7QUFDM0QsbURBQXVEO0FBQ3ZELHdEQUFtRTtBQUNuRSxvRUFLcUM7QUFDckMsMENBT3dCO0FBQ3hCLDhDQUErRTtBQUMvRSxnREFBd0M7QUFDeEMsbUNBQW1DO0FBQ25DLHdEQUFvRTtBQUNwRSw0Q0FBNEM7QUFDNUMsd0NBQW1HO0FBQ25HLHNDQUFpQztBQUNqQyw0REFBd0Q7QUFFeEQsNkRBQTJEO0FBRTNELElBQU8sU0FBUyxHQUFHLGFBQUssQ0FBQyxTQUFTLENBQUM7QUFHbkMsSUFBSSxZQUFZLEdBQXFDLFNBQVMsQ0FBQztBQUMvRCxJQUFJLHFCQUFxQixHQUFxQyxTQUFTLENBQUM7QUFDeEUsSUFBSSxlQUFlLEdBQXFDLFNBQVMsQ0FBQztBQUNsRSxJQUFJLGFBQWEsR0FBcUMsU0FBUyxDQUFDO0FBRWhFLE1BQU0sZUFBZSxHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFDO0FBRXZELGNBQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRTtJQUN0Qix5QkFBeUI7SUFDekIsSUFBSSxzQkFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFO1FBQ3ZDLFlBQVksR0FBRyxpQkFBTyxDQUFDLFFBQVEsQ0FBQyxzQkFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLDhCQUE4QixDQUFDLENBQUM7UUFFekcsS0FBSyxNQUFNLEtBQUssSUFBSSxzQkFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFO1lBQ3JELFlBQVksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDN0I7UUFFRCxJQUFJLHNCQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRTtZQUM5QyxZQUFZO2lCQUNQLFFB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