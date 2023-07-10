import {events} from "bdsx/event";
import {command, CustomCommandFactory} from "bdsx/command";
import {CONFIG, sendConfigForm} from "./configManager";
import {
    cancelClaim,
    CancelClaimResult,
    isPlayerServerBuilder,
    PlayerServerBuilderToggleResult,
    setPlayerServerBuilderState,
} from "./claims/claimBuilder";
import {
    addToMaxBlocks,
    getPlayerFreeBlocks,
    getPlayerMaxBlocks,
    removeFromMaxBlocks
} from "./claims/claimBlocksManager";
import {
    Claim,
    ClaimGroup, createGroup,
    deleteClaim, deleteClaimGroup,
    getClaimAtPos,
    getOwnedClaims,
    getOwnedGroups,
    playerHasPerms
} from "./claims/claim";
import {CommandPermissionLevel, PlayerCommandSelector} from "bdsx/bds/command";
import {bool_t, CxxString, int32_t} from "bdsx/nativetype";
import {createWand} from "./utils";
import {sendPlaytimeFormForPlayer} from "./playerPlaytime/playtime";
import {bedrockServer} from "bdsx/launcher";
import {CustomForm, FormButton, FormInput, FormLabel, FormToggle, ModalForm, SimpleForm} from "bdsx/bds/form";
import {decay} from "bdsx/decay";
import {getCurrentClaim} from "./claims/claimDetection";
import {ServerPlayer} from "bdsx/bds/player";
import {getName, saveData} from "./Storage/storageManager";
import {createDefaultClaimPermission} from "./claims/claimPermissionManager";
import isDecayed = decay.isDecayed;

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
                .overload((_p, origin, output) => {
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
                .overload((_p, origin, output) => {
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
                .overload((_p, origin, output) => {
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

        if (CONFIG.commandOptions.claim.subcommandOptions.addPlayerCommandEnabled) {
            claimCommand
                .overload((params, origin, output) => {
                    const player = origin.getEntity();
                    if (player === null || !player.isPlayer()) {
                        output.error("Command needs to be ran by a player!");
                        return;
                    }

                    const claim = getClaimAtPos(player.getPosition(), player.getDimensionId());
                    if (claim === undefined) {
                        output.error('You are not in a claim!');
                        return;
                    }

                    const xuid = player.getXuid();
                    if (
                        claim.owner !== xuid &&
                        player.getCommandPermissionLevel() === CommandPermissionLevel.Normal &&
                        !playerHasPerms(claim, xuid, "edit_members")
                    ) {
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
                    options: command.enum('options.addplayer', 'addplayer'),
                    target: PlayerCommandSelector,
                })
        }

        if (CONFIG.commandOptions.claim.subcommandOptions.removePlayerCommandEnabled) {
            claimCommand
                .overload((params, origin, output) => {
                    const player = origin.getEntity();
                    if (player === null || !player.isPlayer()) {
                        output.error("Command needs to be ran by a player!");
                        return;
                    }

                    const claim = getClaimAtPos(player.getPosition(), player.getDimensionId());
                    if (claim === undefined) {
                        output.error('You are not in a claim!');
                        return;
                    }

                    const xuid = player.getXuid();
                    if (
                        claim.owner !== xuid &&
                        player.getCommandPermissionLevel() === CommandPermissionLevel.Normal &&
                        !playerHasPerms(claim, xuid, "edit_members")
                    ) {
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
                    options: command.enum('options.removeplayer', 'removeplayer'),
                    target: PlayerCommandSelector,
                })
        }

        if (CONFIG.commandOptions.claim.subcommandOptions.setClaimNameCommandEnabled) {
            claimCommand
                .overload((params, origin, output) => {
                    const player = origin.getEntity();
                    if (player === null || !player.isPlayer()) {
                        output.error("Command needs to be ran by a player!");
                        return;
                    }

                    const claim = getClaimAtPos(player.getPosition(), player.getDimensionId());
                    if (claim === undefined) {
                        output.error("You are not in a claim!");
                        return;
                    }

                    const xuid = player.getXuid();
                    if (
                        claim.owner !== xuid &&
                        player.getCommandPermissionLevel() === CommandPermissionLevel.Normal
                    ) {
                        output.error("You don't have permission to set the name in that claim!")
                    }

                    let trimmedName = params.name.trim();
                    if (trimmedName === "") {
                        output.error("Name cant be blank!");
                        return;
                    }

                    claim.setName(trimmedName);

                    output.success(`§aSet claim name to §e${trimmedName}§a!`);
                }, {
                    options: command.enum('options.setname', 'setname'),
                    name: CxxString,
                })
        }

        if (CONFIG.commandOptions.claim.subcommandOptions.managedMergedClaimsCommandEnabled) {
            claimCommand
                .overload((_p, origin, output) => {
                    const player = origin.getEntity();
                    if (player === null || !player.isPlayer()) {
                        output.error("Command need to be ran by a player!");
                        return;
                    }

                    openClaimMergeOptionsForm(player);
                }, {
                    options: command.enum('options.group', 'group'),
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

        if (CONFIG.commandOptions.fclaim.subcommandOptions.serverClaimCreationModeToggleCommandEnabled) {
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
                    } else {
                        newState = !isPlayerServerBuilder(xuid);
                    }

                    switch (setPlayerServerBuilderState(xuid, newState)) {
                        case PlayerServerBuilderToggleResult.Success: {
                            const message = newState ? "§aYou are now a server builder!" : "§aYou are no longer a server builder!";
                            output.success(message);
                            break;
                        }

                        case PlayerServerBuilderToggleResult.AlreadyNotBuilder: {
                            output.error("You are already not a server builder!");
                            break;
                        }

                        case PlayerServerBuilderToggleResult.AlreadyBuilder: {
                            output.error("You are already a server builder!");
                            break;
                        }

                        case PlayerServerBuilderToggleResult.AlreadyBuildingClaim: {
                            output.error("You cant toggle your server builder state while already building a claim!");
                            break;
                        }
                    }
                }, {
                    options: command.enum('options.sclaimbuildertoggle', 'sclaimbuildertoggle'),
                    enabled: [bool_t, true],
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
        configCommand = command.register(CONFIG.commandOptions.config.commandName, 'Command for editing the config!', CommandPermissionLevel.Operator);

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

    if (CONFIG.commandOptions.claim.subcommandOptions.addPlayerCommandEnabled) {
        buttons.push(new FormButton('Add Player To Claim'));
        buttonIds.push('addplayer');
    }

    if (CONFIG.commandOptions.claim.subcommandOptions.removePlayerCommandEnabled) {
        buttons.push(new FormButton('Remove Player From Claim'));
        buttonIds.push('removeplayer');
    }

    if (CONFIG.commandOptions.claim.subcommandOptions.setClaimNameCommandEnabled) {
        buttons.push(new FormButton('Set Claim Name'));
        buttonIds.push('setname');
    }

    if (CONFIG.commandOptions.claim.subcommandOptions.managedMergedClaimsCommandEnabled) {
        buttons.push(new FormButton('Manage Groups'));
        buttonIds.push('group');
    }

    const form = new SimpleForm('Claim Subcommands', 'Select an option:', buttons);

    form.sendTo(player.getNetworkIdentifier(), (form) => {
        if (form.response === undefined || isDecayed(player)) {
            return;
        }

        const id = buttonIds[form.response];

        const xuid = player.getXuid();

        let claim: Claim | undefined = undefined;
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
                claim = getCurrentClaim(xuid);
                if (claim === undefined) {
                    player.sendMessage('§cYou are not in a claim!');
                    break;
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
            case 'addplayer':
                claim = getClaimAtPos(player.getPosition(), player.getDimensionId());
                if (claim === undefined) {
                    player.sendMessage('§cYou are not in a claim!');
                    break;
                }

                let xuid2 = player.getXuid();
                if (claim.owner !== xuid2 && !playerHasPerms(claim, xuid2, "edit_members") && player.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
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
                            player.sendMessage('§cThe selected player is no long online!')
                            return;
                        }

                        const claim = getClaimAtPos(player.getPosition(), player.getDimensionId());
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
                    })
                })

                break;
            case 'removeplayer':
                claim = getClaimAtPos(player.getPosition(), player.getDimensionId());
                if (claim === undefined) {
                    player.sendMessage('§cYou are not in a claim!');
                    return;
                }

                const xuid3 = player.getXuid();
                if (claim.owner !== xuid3 || playerHasPerms(claim, xuid3, "edit_members") && player.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
                    player.sendMessage('§cYou dont have permission to remove players from this claim!');
                    return;
                }

                let memberXuids = claim.getMemberXuids();
                const memberNames: string[] = [];
                const indexesToRemove: number[] = [];
                for (let i = 0; i < memberXuids.length; i++) {
                    const xuid3 = memberXuids[i];

                    const name = getName(xuid3);
                    if (name === undefined) {
                        indexesToRemove.push(i);
                    } else {
                        memberNames.push(name);
                    }
                }

                for (const _ of indexesToRemove) {
                    memberXuids = memberXuids.filter((_v, i) => {
                        return !indexesToRemove.includes(i);
                    })
                }

                sendSelectPlayerNameForm(player, memberXuids, memberNames).then((xuid) => {
                    if (isDecayed(player) || xuid === undefined) {
                        return;
                    }

                    const claim = getClaimAtPos(player.getPosition(), player.getDimensionId());
                    if (claim === undefined) {
                        player.sendMessage('§cYou are not in a claim!');
                        return;
                    }

                    const name = getName(xuid);

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
                })
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
                })

                break;

            case 'group':
                openClaimMergeOptionsForm(player);
            }
    });
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

enum AddPlayerResult {
    Success,
    AlreadyMember,
}

function addPlayerToClaim(claim: Claim, playerXuid: string) {
    const members = claim.getMemberXuids();
    if (claim.owner === playerXuid || members.includes(playerXuid)) {
        return AddPlayerResult.AlreadyMember;
    }

    claim.setMemberPermissions(playerXuid, createDefaultClaimPermission());

    saveData();

    return AddPlayerResult.Success;
}

enum RemovePlayerResult {
    Success,
    NotAMember,
    CantRemoveOwner
}

function removePlayerFromClaim(claim: Claim, playerXuid: string) {
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

async function sendAndGetSearchPlayerForm(player: ServerPlayer): Promise<ServerPlayer[] | undefined> {
    const form = new CustomForm("Search for Player", [
        new FormInput('Enter player name:'), // 0
        new FormLabel('Match Case:'),
        new FormToggle('', false), // 2
        new FormLabel('Exact Name:'),
        new FormToggle('', false), // 4
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
            const players = bedrockServer.level.getPlayers();
            resolve(
                players.filter((value) => {
                    let foundName = value.getName();
                    if (!res.response[2]) { // Match Case
                        foundName = foundName.toLowerCase();
                    }

                    if (res.response[4]) { // Exact Name
                        return foundName === searchedName;
                    } else {
                        return foundName.includes(searchedName);
                    }
                })
            )
        });
    })
}

async function sendSelectPlayerForm(player: ServerPlayer, playerList: ServerPlayer[]): Promise<ServerPlayer | undefined> {
    const buttons: FormButton[] = [];
    for (const player of playerList) {
        buttons.push(new FormButton(player.getName(), "url", "https://i.imgur.com/t699Gf6.jpg"));
    }

    const form = new SimpleForm('Select a Player', '', buttons);

    return new Promise((resolve) => {
        form.sendTo(player.getNetworkIdentifier(), (res) => {
            if (res.response === null || isDecayed(player)) {
                resolve(undefined);
                return;
            }

            const selectedPlayer = playerList[res.response];
            if (isDecayed(selectedPlayer)) {
                resolve(undefined);
            } else {
                resolve(selectedPlayer);
            }
        })
    })
}

async function sendSelectPlayerNameForm(player: ServerPlayer, xuids: string[], names: string[]): Promise<string | undefined> {
    const buttons: FormButton[] = [];
    for (const name of names) {
        buttons.push(new FormButton(name, 'url', 'https://i.imgur.com/t699Gf6.jpg'));
    }

    const form = new SimpleForm('Select a Player', '', buttons);

    return new Promise((resolve) => {
        form.sendTo(player.getNetworkIdentifier(), (res) => {
            if (isDecayed(player) || res.response === null) {
                resolve(undefined);
                return;
            }

            const xuid = xuids[res.response];
            resolve(xuid);
        })
    })
}

enum SendClaimNameFormFailReason {
    Cancelled,
    NoClaim,
    NoPermission,
    BlankName,
}

async function sendClaimNameInputForm(player: ServerPlayer): Promise<string> {
    const claim = getClaimAtPos(player.getPosition(), player.getDimensionId());
    if (claim === undefined) {
        throw SendClaimNameFormFailReason.NoClaim;
    }

    const xuid = player.getXuid();
    if (
        claim.owner !== xuid &&
        player.getCommandPermissionLevel() === CommandPermissionLevel.Normal &&
        playerHasPerms(claim, xuid, "edit_name")
    ) {
        throw SendClaimNameFormFailReason.NoPermission;
    }

    const isModifyingGroup = claim.tryGetGroup() !== undefined;

    const namingType = isModifyingGroup ? "Group" : "Claim";

    let inputName;
    try {
        inputName = await sendTextInputForm(player, `${namingType} Name`, `Enter the ${namingType} name:`, claim.getName());
    } catch {
        throw SendClaimNameFormFailReason.Cancelled;
    }
    const trimmedInput = inputName.trim();

    if (trimmedInput === "") {
        throw SendClaimNameFormFailReason.BlankName
    }

    claim.setName(trimmedInput);

    player.sendMessage(`The ${namingType} has been renamed to ${trimmedInput}`);

    return trimmedInput;
}

function openClaimMergeOptionsForm(player: ServerPlayer) {
    const playerXuid = player.getXuid();

    const isServer = isPlayerServerBuilder(playerXuid);
    const ownerXuid = isServer ? "SERVER" : playerXuid;

    const form = new SimpleForm(`${isServer ? "Server " : ""}Group Options`, "Select an option:", [
        new FormButton(`Edit Existing Group`),
        new FormButton("Create New Group"),
        new FormButton("Delete Group"),
    ]);

    form.sendTo(player.getNetworkIdentifier(), async (data) => {
        if (data.response === null || isDecayed(player)) {
            return;
        }

        let selectedGroup: ClaimGroup;
        let ownedGroups: ClaimGroup[] | undefined;

        switch (data.response) {
            case 0: // Edit existing group
                ownedGroups = getOwnedGroups(ownerXuid);
                if (ownedGroups.length === 0) {
                    player.sendMessage("You don't have any groups!");
                    return;
                }

                try {
                    selectedGroup = await sendSelectGroupForm(player, ownedGroups);
                } catch {
                    return;
                }

                sendEditGroupFrom(player, selectedGroup, isServer);
                break;
            case 1: // Create new Group
                let groupName: string;
                try {
                    groupName = await sendTextInputForm(player, "Group Name Setter", "Enter the name for the group", `${player.getName()}'s Group`);
                } catch {
                    return;
                }

                ownedGroups = getOwnedGroups(ownerXuid);
                if (ownedGroups !== undefined) {
                    for (const group of ownedGroups) {
                        if (group.groupName === groupName) {
                            player.sendMessage(`§c${!isServer ? "You already have" : "The Server already has"} a group with that name!`);
                            return;
                        }
                    }
                }

                createGroup(groupName, ownerXuid).then(() => {
                    player.sendMessage(`§aCreated a group with the name §e${groupName}§a!`);
                });

                break;
            case 2: // Delete group
                let isRemovingGroup = true;
                while (isRemovingGroup) {
                    ownedGroups = getOwnedGroups(ownerXuid);
                    if (ownedGroups.length === 0) {
                        player.sendMessage("§cYou have no Groups!");
                        isRemovingGroup = false;
                        continue;
                    }

                    try {
                        selectedGroup = await sendSelectGroupForm(player, ownedGroups);
                    } catch {
                        isRemovingGroup = false;
                        continue;
                    }

                    try {
                        deleteClaimGroup(selectedGroup);
                        player.sendMessage("§aGroup deleted!");
                    } catch {
                        player.sendMessage("§cGroup already deleted!");
                    }

                    if (ownedGroups.length === 1) {
                        isRemovingGroup = false;
                    } else {
                        try {
                            isRemovingGroup = await sendYesNoForm(player, "Remove Another?", "Do you want to remove another Group?");
                        } catch {
                            isRemovingGroup = false;
                        }
                    }
                }

                break;
        }
    })
}

async function sendSelectGroupForm(player: ServerPlayer, groups: ClaimGroup[]): Promise<ClaimGroup> {
    const buttons: FormButton[] = [];
    for (const group of groups) {
        buttons.push(new FormButton(group.groupName));
    }

    const form = new SimpleForm("Group List", "Select the group you want:", buttons);

    return new Promise((resolve, reject) => {
        form.sendTo(player.getNetworkIdentifier(), (data) => {
            if (data.response === null || isDecayed(player)) {
                reject();
            }

            resolve(groups[data.response]);
        })
    })
}

function sendEditGroupFrom(player: ServerPlayer, group: ClaimGroup, isServer: boolean) {
    const form = new SimpleForm("Group Options", "Select an option:", [
        new FormButton("Add Claim to Group"),
        new FormButton("Remove Claim from Group"),
        new FormButton("Edit Existing Claim"),
    ])

    form.sendTo(player.getNetworkIdentifier(), async (data) => {
        if (data.response === null || isDecayed(player)) {
            return;
        }

        const xuid = isServer ? "SERVER" : player.getXuid();
        let claim: Claim;
        let groupedClaims;

        switch (data.response) {
            case 0:
                let isAddingAnother = true;

                let isFirstLoop = true;

                while (isAddingAnother) {
                    const allNonGroupedClaims = getClaimsNotInGroup(xuid)

                    if (allNonGroupedClaims.length === 0) {
                        player.sendMessage(`§cYou have no ${isFirstLoop ? "" : "more "}claims to add!`);
                        isAddingAnother = false;
                        continue;
                    }

                    isFirstLoop = false;

                    try {
                        claim = await sendSelectClaimForm(player, allNonGroupedClaims);
                    } catch {
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
                    } catch {
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
                    } catch {
                        isRemovingAnother = false;
                        continue;
                    }

                    let didRemove = false;
                    const newClaimGroupIds: string[] = group.claimIds.filter((value) => {
                        let willRemove = value === claim.id;
                        if (willRemove) {
                            didRemove = true;
                        }

                        return !willRemove;
                    });

                    if (!didRemove) {
                        player.sendMessage("§cThat claim isn't in the group!");
                    } else {
                        group.claimIds = newClaimGroupIds;

                        player.sendMessage(`§e${claim.getName(true)}§a removed from the group!`);
                    }

                    if (groupedClaims.length === 1) {
                        isRemovingAnother = false;
                    } else {
                        try {
                            isRemovingAnother = await sendYesNoForm(player, "Remove Another?", "Remove another claim?");
                        } catch {
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
                } catch {
                    return;
                }

                sendEditClaimForm(player, claim);
                break;
        }
    });
}

async function sendSelectClaimForm(player: ServerPlayer, claimList: Claim[], title: string = "Claim List", description: string = "Select a claim"): Promise<Claim> {
    const buttons: FormButton[] = [];
    for (const claim of claimList) {
        buttons.push(new FormButton(claim.getName(true)));
    }

    const form = new SimpleForm(title, description, buttons);

    return new Promise((resolve, reject) => {
        form.sendTo(player.getNetworkIdentifier(), (data) => {
            if (data.response === null || isDecayed(player)) {
                reject();
            }

            resolve(claimList[data.response]);
        })
    })
}

async function sendTextInputForm(player: ServerPlayer, title: string, description: string, defaultName?: string): Promise<string> {
    return new Promise((resolve, reject) => {

        const form = new CustomForm(title, [
            new FormInput(description, defaultName, defaultName),
        ])


        form.sendTo(player.getNetworkIdentifier(), (res) => {
            if (res.response === null || isDecayed(player)) {
                reject();
                return;
            }

            resolve(res.response[0]);
        })
    });
}

function sendEditClaimForm(player: ServerPlayer, claim: Claim) {
    const form = new SimpleForm("Claim Configuration", "Select an option:", [
        new FormButton("Edit Name"),
    ])

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
    })
}

function getClaimsNotInGroup(playerXuid: string) {
    const claims: Claim[] = [];
    const ownedClaims = getOwnedClaims(playerXuid);
    for (const claim of ownedClaims) {
        if (claim.tryGetGroup() === undefined) {
            claims.push(claim);
        }
    }

    return claims;
}

async function sendYesNoForm(player: ServerPlayer, title: string, description: string): Promise<boolean> {
    const form = new ModalForm(title, description);

    form.setButtonCancel("No");
    form.setButtonConfirm("Yes");

    return new Promise((resolve, reject) => {
        form.sendTo(player.getNetworkIdentifier(), (data) => {
            if (isDecayed(player)) {
                reject();
                return;
            }

            resolve(data.response === true);
        })
    })
}
