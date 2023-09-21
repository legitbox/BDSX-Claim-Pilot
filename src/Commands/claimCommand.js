"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCancelClaim = exports.handleWandCommand = void 0;
const event_1 = require("bdsx/event");
const configManager_1 = require("../configManager");
const command_1 = require("bdsx/command");
const utils_1 = require("../utils");
const claim_1 = require("../claims/claim");
const form_1 = require("bdsx/bds/form");
const decay_1 = require("bdsx/decay");
const storageManager_1 = require("../Storage/storageManager");
const claimPermissionManager_1 = require("../claims/claimPermissionManager");
const command_2 = require("bdsx/bds/command");
const launcher_1 = require("bdsx/launcher");
const claimBlocksManager_1 = require("../claims/claimBlocksManager");
const claimBuilder_1 = require("../claims/claimBuilder");
var isDecayed = decay_1.decay.isDecayed;
const commandUtils_1 = require("./commandUtils");
const overideTextSystem_1 = require("../overideTextSystem");
event_1.events.serverOpen.on(() => {
    const claimCommandConfig = configManager_1.CONFIG.commandOptions.claim;
    if (claimCommandConfig.isEnabled) {
        const claimCommand = command_1.command
            .register(claimCommandConfig.commandName, "Command for managing claims!");
        for (const alias of claimCommandConfig.aliases) {
            claimCommand.alias(alias);
        }
        if (claimCommandConfig.quickFormEnabled) {
            claimCommand.overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (!(player === null || player === void 0 ? void 0 : player.isPlayer())) {
                    output.error("Command needs to be ran by a player!");
                    return;
                }
                sendClaimCommandSimpleForm(player).then();
            }, {});
        }
        if (claimCommandConfig.subcommandOptions.giveWandCommandEnabled) {
            claimCommand.overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (!(player === null || player === void 0 ? void 0 : player.isPlayer())) {
                    output.error("Command needs to be ran by a player!");
                    return;
                }
                handleWandCommand(player);
            }, {
                options: command_1.command.enum('options.wand', 'wand'),
            });
        }
        if (claimCommandConfig.subcommandOptions.editClaimCommandEnabled) {
            claimCommand.overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (!(player === null || player === void 0 ? void 0 : player.isPlayer())) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }
                handleEditCommand(player).then();
            }, {
                options: command_1.command.enum('options.edit', 'edit'),
            });
        }
        if (claimCommandConfig.subcommandOptions.cancelClaimCreationCommandEnabled) {
            claimCommand.overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (!(player === null || player === void 0 ? void 0 : player.isPlayer())) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }
                handleCancelClaim(player);
            }, {
                options: command_1.command.enum('options.cancel', 'cancel'),
            });
        }
        if (claimCommandConfig.subcommandOptions.checkBlocksCommandEnabled) {
            claimCommand.overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (!(player === null || player === void 0 ? void 0 : player.isPlayer())) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }
                sendPlayerBlocks(player);
            }, {
                options: command_1.command.enum('options.blocks', 'blocks'),
            });
        }
    }
});
const wandCooldownMap = new Map();
function handleWandCommand(executor) {
    const xuid = executor.getXuid();
    const lastRequestTime = wandCooldownMap.get(xuid);
    const now = Date.now();
    if (lastRequestTime !== undefined && now - lastRequestTime <= configManager_1.CONFIG.giveWandCooldown) {
        executor.sendMessage(`§cYou need to wait ${Math.floor((configManager_1.CONFIG.giveWandCooldown - (now - lastRequestTime)) / 1000)} more seconds before requesting a new wand!`);
        return;
    }
    const wandItem = (0, utils_1.createWand)();
    const didAdd = executor.getInventory().addItem(wandItem, true);
    if (!didAdd) {
        executor.sendMessage(`§cYou dont have enough free space for the wand!`);
        return;
    }
    executor.sendInventory();
    wandCooldownMap.set(xuid, now);
    executor.sendMessage(`§aWand given!`);
}
exports.handleWandCommand = handleWandCommand;
async function handleEditCommand(executor) {
    // Select Claim/Group selection
    const res = await (0, commandUtils_1.sendTwoChoiceForm)(executor, "Select Search Type", "Select whether you want to edit your claims or groups", "Claims", "Groups");
    switch (res) {
        case commandUtils_1.TwoChoiceFormResult.Cancel:
            return;
        case commandUtils_1.TwoChoiceFormResult.OptionOne:
            handleEditClaimForm(executor).then();
            break;
        case commandUtils_1.TwoChoiceFormResult.OptionTwo:
            handleEditGroupForm(executor).then();
            break;
    }
}
async function handleEditGroupForm(target) {
    const targetXuid = target.getXuid();
    const ret = await (0, commandUtils_1.sendTwoChoiceForm)(target, "Group Choice", "Select an Option", "Create a Group", "Edit an Existing Group");
    if (ret === commandUtils_1.TwoChoiceFormResult.Cancel) {
        return;
    }
    else if (ret === commandUtils_1.TwoChoiceFormResult.OptionOne) {
        await sendCreateGroupForm(target);
        return;
    }
    let groups;
    if ((0, claimBuilder_1.isPlayerServerBuilder)(targetXuid)) {
        groups = (0, claim_1.getOwnedGroups)("SERVER");
    }
    else {
        groups = (0, claim_1.getEditableGroups)(targetXuid);
    }
    const selectedGroup = await selectGroupForm(target, groups);
    if (selectedGroup === undefined) {
        return;
    }
    const buttons = [];
    const actionIds = [];
    const isOp = target.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Operator;
    const isOwner = selectedGroup.getOwner() === targetXuid;
    const isCoOwner = selectedGroup.isCoOwner(targetXuid);
    const canEditName = (0, claim_1.getPlayerPermissionState)(selectedGroup, targetXuid, "edit_name");
    const canEditMembers = (0, claim_1.getPlayerPermissionState)(selectedGroup, targetXuid, "edit_members");
    if (canEditName) {
        buttons.push(new form_1.FormButton("Edit Group Name"));
        actionIds.push("edit_name");
    }
    if (isOwner || isCoOwner || isOp) {
        buttons.push(new form_1.FormButton("Edit Grouped Claim"));
        actionIds.push("edit_claim");
    }
    if (canEditMembers) {
        buttons.push(new form_1.FormButton("Edit Members"));
        actionIds.push("edit_members");
    }
    if (isOp || isOwner) {
        buttons.push(new form_1.FormButton("Delete"));
        actionIds.push("delete_group");
    }
    if (buttons.length === 0) {
        target.sendMessage("§cYou dont have permission to edit this group!");
        return;
    }
    const form = new form_1.SimpleForm('Group Options', 'Select An Option', buttons);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            switch (actionIds[data.response]) {
                case "edit_claim":
                    await editGroupClaimOptions(target, selectedGroup);
                    break;
                case "edit_name":
                    const currentName = selectedGroup.getName();
                    let newName = await sendNameInputForm(target, "Group Name:", currentName, currentName);
                    if (newName === undefined) {
                        break;
                    }
                    if (!(0, claim_1.getPlayerPermissionState)(selectedGroup, targetXuid, "edit_name") &&
                        target.getCommandPermissionLevel() !== command_2.CommandPermissionLevel.Operator) {
                        target.sendMessage(`§cYou dont have permission to change this groups name!`);
                        break;
                    }
                    selectedGroup.setName(newName);
                    (0, storageManager_1.saveData)();
                    target.sendMessage(`§aGroup name updated!`);
                    break;
                case "edit_members":
                    await editGroupMembersOptions(target, selectedGroup);
                    break;
                case "delete_group":
                    const ret = await (0, commandUtils_1.sendTwoChoiceForm)(target, "Delete Confirmation", "§cAre you sure you want to delete this group?\n\n§eNote: §aThis wont delete the claims inside the group.\n§eNote: §aThis will update the grouped claims to match the groups perms", "Yes", "No");
                    if (ret !== commandUtils_1.TwoChoiceFormResult.OptionOne) {
                        break;
                    }
                    if (target.getCommandPermissionLevel() !== command_2.CommandPermissionLevel.Operator &&
                        selectedGroup.getOwner() !== targetXuid) {
                        target.sendMessage("§cYou dont have permission to delete this group!");
                        break;
                    }
                    (0, claim_1.deleteClaimGroup)(selectedGroup);
                    (0, storageManager_1.saveData)();
                    target.sendMessage("§aGroup deleted!");
                    break;
            }
            resolve(undefined);
        });
    });
}
async function handleEditClaimForm(target) {
    const xuid = target.getXuid();
    let isServerBuilder = (0, claimBuilder_1.isPlayerServerBuilder)(xuid);
    let claims;
    if (isServerBuilder) {
        claims = (0, claim_1.getOwnedClaims)("SERVER", false);
    }
    else {
        claims = (0, claim_1.getEditableClaims)(target.getXuid(), false);
    }
    const selectedClaim = await selectClaimForm(target, claims);
    if (selectedClaim === undefined) {
        return;
    }
    const buttons = [];
    const actionIds = [];
    const isOp = target.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Operator;
    if ((0, claim_1.getPlayerPermissionState)(selectedClaim, xuid, "edit_name")) {
        buttons.push(new form_1.FormButton("Set Claim Name"));
        actionIds.push("edit_name");
    }
    const isOwner = selectedClaim.getOwner() === xuid;
    const canEditMembers = (0, claim_1.getPlayerPermissionState)(selectedClaim, xuid, "edit_members");
    if (canEditMembers) {
        buttons.push(new form_1.FormButton("Edit Members"));
        actionIds.push("edit_members");
    }
    if (isOp || isOwner) {
        buttons.push(new form_1.FormButton("Delete"));
        actionIds.push("delete_claim");
    }
    if (buttons.length === 0) {
        target.sendMessage("§cYou dont have permission to edit this claim!");
        return;
    }
    const centerPos = selectedClaim.getCenterPoint();
    const form = new form_1.SimpleForm("Claim Options", `Select an option:\nClaim Pos: (X: ${Math.floor(centerPos.x)}, Y: ${Math.floor(centerPos.y)}, Z: ${Math.floor(centerPos.z)})`, buttons);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            const actionId = actionIds[data.response];
            const playerXuid = target.getXuid();
            switch (actionId) {
                case "edit_name":
                    const currentName = selectedClaim.getName();
                    let newName = await sendNameInputForm(target, "Claim Name:", currentName, currentName);
                    if (newName === undefined) {
                        resolve(undefined);
                        return;
                    }
                    else {
                        // Checking target perms one last time
                        if (target.getCommandPermissionLevel() !== command_2.CommandPermissionLevel.Operator &&
                            !(0, claim_1.getPlayerPermissionState)(selectedClaim, playerXuid, "edit_name")) {
                            target.sendMessage('§cYou dont have permission to set the claim name!');
                            resolve(undefined);
                            return;
                        }
                        selectedClaim.setName(newName);
                        (0, storageManager_1.saveData)();
                        target.sendMessage(`§aSet claim name to §e${newName}`);
                        resolve(undefined);
                        return;
                    }
                case "edit_members":
                    editClaimMembersOptions(target, selectedClaim).then();
                    resolve(undefined);
                    break;
                case "delete_claim":
                    const ret = await (0, commandUtils_1.sendTwoChoiceForm)(target, "Delete Confirmation", `Are you sure you want to delete this claim?\nThis will free ${(0, utils_1.getNumOfBlocksInBox)(selectedClaim.cornerOne, selectedClaim.cornerEight)} blocks.`, "Yes", "No");
                    if (ret !== commandUtils_1.TwoChoiceFormResult.OptionOne) {
                        resolve(undefined);
                        return;
                    }
                    const canDelete = target.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Operator || selectedClaim.getOwner() === playerXuid;
                    if (!canDelete) {
                        target.sendMessage(`§cYou dont have permission to delete this claim!`);
                        resolve(undefined);
                        return;
                    }
                    (0, claim_1.deleteClaim)(selectedClaim);
                    target.sendMessage(`§aClaim Deleted`);
                    resolve(undefined);
                    return;
            }
        });
    });
}
async function sendCreateGroupForm(target) {
    const targetXuid = target.getXuid();
    const targetName = target.getName();
    const isServerBuilder = (0, claimBuilder_1.isPlayerServerBuilder)(targetXuid);
    const defaultName = isServerBuilder ? "Server Group" : `${targetName}'s Group`;
    const groupName = await sendNameInputForm(target, "Group Name:", defaultName, defaultName);
    if (groupName === undefined) {
        return;
    }
    let claims;
    if (isServerBuilder) {
        claims = (0, claim_1.getOwnedClaims)("SERVER", false);
    }
    else {
        claims = (0, claim_1.getOwnedClaims)(targetXuid, false);
    }
    const selectedClaim = await selectClaimForm(target, claims, "Select a Claim", "Select the first claim for this group:");
    if (selectedClaim === undefined) {
        return;
    }
    const options = {
        initialClaims: [selectedClaim],
    };
    const ownerXuid = isServerBuilder ? "SERVER" : targetXuid;
    await (0, claim_1.createGroup)(groupName, ownerXuid, options);
    target.sendMessage("§aGroup Created!");
}
async function sendNameInputForm(target, description, placeholderValue, defaultValue) {
    let newName = undefined;
    let retry = true;
    while (retry) {
        let attemptedName = await (0, commandUtils_1.sendTextInputForm)(target, "Enter New Name", description, placeholderValue, defaultValue);
        if (attemptedName === undefined) {
            return;
        }
        if (attemptedName.trim() === "") {
            // Blank Error
            const ret = await (0, commandUtils_1.sendTwoChoiceForm)(target, "Error With Name", "Name cant be blank!\nRetry?", "Yes", "No");
            retry = ret === commandUtils_1.TwoChoiceFormResult.OptionOne;
            continue;
        }
        newName = attemptedName;
        retry = false;
    }
    return newName;
}
async function selectGroupForm(target, groups) {
    if (groups.length === 0) {
        target.sendMessage(`§cNo groups to choose from!`);
        return;
    }
    const buttons = [];
    for (const group of groups) {
        buttons.push(new form_1.FormButton(group.getName()));
    }
    const form = new form_1.SimpleForm("Select Group", "Select a group:", buttons);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            resolve(groups[data.response]);
        });
    });
}
async function selectClaimForm(target, claims, title = "Select Claim", description = "Select a claim:", ignoreGroup = false) {
    if (claims.length === 0) {
        target.sendMessage('§cNo claims to choose from!');
        return;
    }
    const buttons = [];
    for (const claim of claims) {
        buttons.push(new form_1.FormButton(claim.getName(ignoreGroup)));
    }
    const form = new form_1.SimpleForm(title, description, buttons);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
            }
            resolve(claims[data.response]);
        });
    });
}
async function editGroupMembersOptions(target, group) {
    const buttons = [new form_1.FormButton("Edit an existing member")];
    const actionIds = ["edit_member"];
    if (target.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Operator || group.getOwner() === target.getXuid()) {
        buttons.push(new form_1.FormButton("Add a member"));
        actionIds.push("add_member");
    }
    const form = new form_1.SimpleForm('Group Member Options', "Choose and Option", buttons);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            switch (actionIds[data.response]) {
                case "add_member":
                    const onlinePlayers = launcher_1.bedrockServer.level.getPlayers();
                    const onlineXuids = [];
                    for (const player of onlinePlayers) {
                        const xuid = player.getXuid();
                        if (xuid === target.getXuid()) {
                            continue;
                        }
                        const name = (0, storageManager_1.getName)(xuid);
                        if (name === undefined) {
                            (0, storageManager_1.setName)(xuid, player.getName());
                        }
                        onlineXuids.push(xuid);
                    }
                    const selectedPlayer = await (0, commandUtils_1.selectPlayerForm)(target, onlineXuids, "Select a Member", "Choose a member to edit:");
                    if (selectedPlayer === undefined) {
                        break;
                    }
                    if (target.getCommandPermissionLevel() !== command_2.CommandPermissionLevel.Operator &&
                        group.getOwner() !== target.getXuid()) {
                        target.sendMessage("§cYou dont have permission to add a member to this claim!");
                        break;
                    }
                    group.setMemberPermissions(selectedPlayer, new Map());
                    (0, storageManager_1.saveData)();
                    target.sendMessage("§aAdded player!");
                    break;
                case "edit_member":
                    const members = group.getMemberXuids();
                    const selectedMember = await (0, commandUtils_1.selectPlayerForm)(target, members, "Select a Member", "Select a member to edit:");
                    if (selectedMember === undefined) {
                        break;
                    }
                    await editGroupMemberOptions(target, group, selectedMember);
                    break;
            }
            resolve(undefined);
        });
    });
}
async function editClaimMembersOptions(target, claim) {
    const buttons = [new form_1.FormButton("Edit an existing member")];
    const actionIds = ["edit_member"];
    if (target.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Operator || claim.getOwner() === target.getXuid()) {
        buttons.push(new form_1.FormButton("Add a member"));
        actionIds.push("add_member");
    }
    const form = new form_1.SimpleForm("Claim Member Options", "Choose an Option", buttons);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            switch (actionIds[data.response]) {
                case "add_member":
                    const onlinePlayers = launcher_1.bedrockServer.level.getPlayers();
                    const onlinePlayerXuids = [];
                    for (const player of onlinePlayers) {
                        const xuid = player.getXuid();
                        if (xuid === target.getXuid()) {
                            continue;
                        }
                        const memberPerm = claim.getMemberPermissions(xuid);
                        if (memberPerm !== undefined || claim.isCoOwner(xuid) || claim.getOwner() === xuid) {
                            continue;
                        }
                        let name = (0, storageManager_1.getName)(xuid);
                        if (name === undefined) {
                            name = player.getName();
                            (0, storageManager_1.setName)(xuid, name);
                        }
                        onlinePlayerXuids.push(xuid);
                    }
                    const selectedPlayer = await (0, commandUtils_1.selectPlayerForm)(target, onlinePlayerXuids, "Select a Player", "Select a Player to add to this claim");
                    if (selectedPlayer === undefined) {
                        resolve(undefined);
                        return;
                    }
                    const name = (0, storageManager_1.getName)(selectedPlayer);
                    const ret = await (0, commandUtils_1.sendTwoChoiceForm)(target, "Add Member Confirmation", `Are you sure you want to add ${name} as a member to this claim?`, "Yes", "No");
                    if (ret !== commandUtils_1.TwoChoiceFormResult.OptionOne) {
                        resolve(undefined);
                        return;
                    }
                    const canAdd = (target.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Operator || claim.getOwner() === target.getXuid());
                    if (!canAdd) {
                        target.sendMessage(`§cYou dont have permission to add a player to this claim!`);
                        resolve(undefined);
                        return;
                    }
                    claim.setMemberPermissions(selectedPlayer, new Map());
                    (0, storageManager_1.saveData)();
                    target.sendMessage('§aPlayer added as member to claim!');
                    resolve(undefined);
                    return;
                case "edit_member":
                    const memberXuids = claim.getMemberXuids();
                    const memberXuid = await (0, commandUtils_1.selectPlayerForm)(target, memberXuids, "Select a Member", "Choose the member you want to edit:");
                    if (memberXuid === undefined) {
                        resolve(undefined);
                        return;
                    }
                    await editClaimMemberOptions(target, claim, memberXuid);
                    resolve(undefined);
                    return;
            }
        });
    });
}
function getButtonsForEditMemberOptions(target, group, memberXuid) {
    const targetXuid = target.getXuid();
    const isOwnerOrOp = group.getOwner() === targetXuid || target.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Operator;
    if (!isOwnerOrOp && !group.isCoOwner(targetXuid)) {
        target.sendMessage(`§cYou dont have permission to modify members!`);
        return;
    }
    const buttons = [];
    const actionIds = [];
    const memberIsCoOwner = group.isCoOwner(memberXuid);
    if (isOwnerOrOp) {
        buttons.push(new form_1.FormButton("Remove Player"));
        actionIds.push("delete_player");
        if (memberIsCoOwner) {
            buttons.push(new form_1.FormButton("Remove Co-Owner"));
            actionIds.push("remove_admin");
        }
        else {
            buttons.push(new form_1.FormButton("Make Co-Owner"));
            actionIds.push("give_admin");
        }
    }
    if ((isOwnerOrOp || group.isCoOwner(targetXuid)) && !memberIsCoOwner) {
        buttons.push(new form_1.FormButton("Edit Permissions"));
        actionIds.push("edit_perms");
    }
    if (buttons.length === 0) {
        target.sendMessage(`§cYou dont have permission to edit this player!`);
        return;
    }
    return [buttons, actionIds];
}
async function editGroupMemberOptions(target, group, memberXuid) {
    const targetXuid = target.getXuid();
    const ret = getButtonsForEditMemberOptions(target, group, memberXuid);
    if (ret === undefined) {
        return;
    }
    const [buttons, actionIds] = ret;
    const form = new form_1.SimpleForm('Edit Member', 'Select an Option', buttons);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            let ret;
            switch (actionIds[data.response]) {
                case "edit_perms":
                    await editMemberPerms(target, memberXuid, group);
                    resolve(undefined);
                    break;
                case "remove_admin":
                    ret = await (0, commandUtils_1.sendTwoChoiceForm)(target, "Remove Co-Owner Confirmation", `Are you sure you want to remove Co-Owner from ${(0, storageManager_1.getName)(memberXuid)}?`, "Yes", "No");
                    if (ret !== commandUtils_1.TwoChoiceFormResult.OptionOne) {
                        break;
                    }
                    if (group.getOwner() !== targetXuid &&
                        target.getCommandPermissionLevel() !== command_2.CommandPermissionLevel.Operator) {
                        target.sendMessage("§cYou dont have permission to remove Co-Owner from members");
                        break;
                    }
                    group.removeCoOwner(memberXuid);
                    (0, storageManager_1.saveData)();
                    target.sendMessage("§aSuccessfully removed Co-Owner from player!");
                    break;
                case "give_admin":
                    ret = await (0, commandUtils_1.sendTwoChoiceForm)(target, "Give Co-Owner Confirmation", `Are you sure you want to make ${(0, storageManager_1.getName)(memberXuid)} a Co-Owner?`, "Yes", "No");
                    if (ret !== commandUtils_1.TwoChoiceFormResult.OptionOne) {
                        break;
                    }
                    if (group.getOwner() !== targetXuid &&
                        target.getCommandPermissionLevel() !== command_2.CommandPermissionLevel.Operator) {
                        target.sendMessage("§cYou dont have permission to make members a Co-Owner!");
                        break;
                    }
                    group.addCoOwner(memberXuid);
                    (0, storageManager_1.saveData)();
                    target.sendMessage("§aPlayer is now a Co-Owner!");
                    break;
                case "delete_player":
                    ret = await (0, commandUtils_1.sendTwoChoiceForm)(target, "Removal Confirmation", "Remove player from Group", "Yes", "No");
                    if (ret !== commandUtils_1.TwoChoiceFormResult.OptionOne) {
                        break;
                    }
                    if (group.getOwner() !== targetXuid && target.getCommandPermissionLevel() !== command_2.CommandPermissionLevel.Operator) {
                        target.sendMessage("§cYou dont have permission to remove players from this group!");
                        break;
                    }
                    group.removeMember(memberXuid);
                    (0, storageManager_1.saveData)();
                    target.sendMessage("§aSuccessfully deleted player!");
                    break;
            }
            resolve(undefined);
        });
    });
}
async function editClaimMemberOptions(target, claim, memberXuid) {
    const targetXuid = target.getXuid();
    const ret = getButtonsForEditMemberOptions(target, claim, memberXuid);
    if (ret === undefined) {
        return undefined;
    }
    const [buttons, actionIds] = ret;
    const form = new form_1.SimpleForm("Edit Member", "Select an Option", buttons);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            const actionId = actionIds[data.response];
            switch (actionId) {
                case "give_admin":
                    if (claim.getOwner() !== targetXuid) {
                        target.sendMessage('§cYou dont have permission to make someone a Co-Owner in this claim!');
                        resolve(undefined);
                        return;
                    }
                    claim.addCoOwner(memberXuid);
                    (0, storageManager_1.saveData)();
                    target.sendMessage(`§aPlayer is now a Co-Owner!`);
                    resolve(undefined);
                    break;
                case "remove_admin":
                    if (claim.getOwner() !== targetXuid) {
                        target.sendMessage(`§cYou dont have permission to remove Co-Owner in this claim!`);
                        resolve(undefined);
                        return;
                    }
                    claim.removeCoOwner(memberXuid);
                    (0, storageManager_1.saveData)();
                    target.sendMessage(`§aPlayer is no longer a Co-Owner!`);
                    resolve(undefined);
                    break;
                case "delete_player":
                    const memberName = (0, storageManager_1.getName)(memberXuid);
                    // Send confirmation box
                    const res = await (0, commandUtils_1.sendTwoChoiceForm)(target, "Remove Confirmation", `Are you sure you want to remove ${memberName} from this claim?`, "Yes", "No");
                    if (res !== commandUtils_1.TwoChoiceFormResult.OptionOne) {
                        resolve(undefined);
                        return;
                    }
                    // Final permissions check
                    const canDelete = claim.getOwner() === targetXuid || target.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Operator;
                    if (!canDelete) {
                        target.sendMessage('§cYou dont have permission to remove players from this claim!');
                        resolve(undefined);
                        return;
                    }
                    if (claim.isCoOwner(memberXuid)) {
                        claim.removeCoOwner(memberXuid);
                    }
                    claim.removeMember(memberXuid);
                    (0, storageManager_1.saveData)();
                    target.sendMessage(`§e${memberName}§a removed!`);
                    resolve(undefined);
                    break;
                case "edit_perms":
                    await editMemberPerms(target, memberXuid, claim);
                    resolve(undefined);
                    break;
            }
        });
    });
}
async function sendPermissionForm(target, currentPermissions = new Map(), title = "Edit Permissions") {
    let permDatas = (0, claimPermissionManager_1.getClaimPermissionDatas)();
    const toggles = [];
    permDatas = permDatas.filter((value) => {
        if (value.onlyCoOwner) {
            return false;
        }
        let defaultValue = currentPermissions.get(value.permissionName);
        if (defaultValue === undefined) {
            defaultValue = value.defaultValue;
        }
        toggles.push(new form_1.FormToggle(value.optionName, defaultValue));
        return true;
    });
    const form = new form_1.CustomForm(title, toggles);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            const newPermMap = new Map();
            for (let i = 0; i < data.response.length; i++) {
                const permData = permDatas[i];
                const value = data.response[i];
                newPermMap.set(permData.permissionName, value);
            }
            resolve(newPermMap);
        });
    });
}
async function editGroupClaimOptions(target, group) {
    const buttons = [];
    const actionIds = [];
    const targetXuid = target.getXuid();
    const isOp = target.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Operator;
    const isOwner = group.getOwner() === targetXuid;
    const canEditName = (0, claim_1.getPlayerPermissionState)(group, targetXuid, "edit_players") || isOp;
    if (isOwner || canEditName) {
        buttons.push(new form_1.FormButton("Edit Existing Claim"));
        actionIds.push("edit_claim");
    }
    if (isOwner || isOp) {
        buttons.push(new form_1.FormButton("Add Claim"));
        actionIds.push("add_claim");
    }
    if (buttons.length === 0) {
        target.sendMessage("§cYou dont have permission to edit any claims!");
        return;
    }
    const form = new form_1.SimpleForm("Group Claim Options", "Select an Option:", buttons);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            switch (actionIds[data.response]) {
                case "edit_claim":
                    await editGroupClaim(target, group);
                    break;
                case "add_claim":
                    let claims;
                    if ((0, claimBuilder_1.isPlayerServerBuilder)(targetXuid)) {
                        claims = (0, claim_1.getOwnedClaims)("SERVER", false);
                    }
                    else {
                        claims = (0, claim_1.getOwnedClaims)(targetXuid, false);
                    }
                    const selectedClaim = await selectClaimForm(target, claims, undefined, undefined, true);
                    if (selectedClaim === undefined) {
                        break;
                    }
                    if (target.getCommandPermissionLevel() !== command_2.CommandPermissionLevel.Operator &&
                        group.getOwner() !== targetXuid) {
                        target.sendMessage("§cYou dont have permission to add claims to this group!");
                        break;
                    }
                    group.addClaim(selectedClaim, true);
                    (0, storageManager_1.saveData)();
                    target.sendMessage("§aSuccessfully added claim to group!");
                    break;
            }
            resolve(undefined);
        });
    });
}
async function editGroupClaim(target, group) {
    const claims = group.getClaims();
    const selectedClaim = await selectClaimForm(target, claims, undefined, undefined, true);
    if (selectedClaim === undefined) {
        return;
    }
    const buttons = [];
    const actionIds = [];
    const targetXuid = target.getXuid();
    const isOp = target.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Operator;
    if (isOp || (0, claim_1.getPlayerPermissionState)(group, targetXuid, "edit_name")) {
        buttons.push(new form_1.FormButton("Edit Sub-Name"));
        actionIds.push("edit_name");
    }
    if (isOp || group.getOwner() === targetXuid) {
        buttons.push(new form_1.FormButton("Remove Claim From Group"));
        actionIds.push("remove_claim");
        buttons.push(new form_1.FormButton("Delete Claim"));
        actionIds.push("delete_claim");
    }
    if (buttons.length === 0) {
        target.sendMessage("§cYou dont have permission to edit this claim!");
        return;
    }
    const centerPoint = selectedClaim.getCenterPoint();
    const form = new form_1.SimpleForm("Grouped Claim Options", `Location: (X: ${Math.floor(centerPoint.x)} Y: ${Math.floor(centerPoint.y)} Z: ${Math.floor(centerPoint.z)})\nSelect an Option:`, buttons);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            let ret;
            switch (actionIds[data.response]) {
                case "delete_claim":
                    ret = await (0, commandUtils_1.sendTwoChoiceForm)(target, "Delete Confirmation", "Are you sure you want to delete this claim?", "Yes", "No");
                    if (ret !== commandUtils_1.TwoChoiceFormResult.OptionOne) {
                        break;
                    }
                    if (target.getCommandPermissionLevel() !== command_2.CommandPermissionLevel.Operator &&
                        group.getOwner() !== targetXuid) {
                        target.sendMessage("§cYou dont have permission to delete that claim!");
                        break;
                    }
                    group.removeClaim(selectedClaim);
                    (0, claim_1.deleteClaim)(selectedClaim);
                    break;
                case "remove_claim":
                    ret = await (0, commandUtils_1.sendTwoChoiceForm)(target, "Remove Confirmation", "Do you want to remove this claim from the group?\n\nNote: This wont delete the claim", "Yes", "No");
                    if (ret !== commandUtils_1.TwoChoiceFormResult.OptionOne) {
                        break;
                    }
                    if (target.getCommandPermissionLevel() !== command_2.CommandPermissionLevel.Operator &&
                        group.getOwner() !== targetXuid) {
                        target.sendMessage("§cYou dont have permission to remove that claim!");
                        break;
                    }
                    group.removeClaim(selectedClaim);
                    (0, storageManager_1.saveData)();
                    target.sendMessage("§aSuccessfully removed claim from group!");
                    break;
                case "edit_name":
                    const currentName = selectedClaim.getName(true);
                    const name = await sendNameInputForm(target, "Claim Sub-Name:", currentName, currentName);
                    if (name === undefined) {
                        break;
                    }
                    if (target.getCommandPermissionLevel() !== command_2.CommandPermissionLevel.Operator &&
                        !(0, claim_1.getPlayerPermissionState)(group, targetXuid, "edit_name")) {
                        target.sendMessage("§cYou dont have permission to change this groups name!");
                    }
                    selectedClaim.setName(name, true);
                    (0, storageManager_1.saveData)();
                    target.sendMessage("Updated Claim Sub-Name");
                    break;
            }
            resolve(undefined);
        });
    });
}
async function editMemberPerms(target, memberXuid, group) {
    const targetXuid = target.getXuid();
    const currentPerms = group.getMemberPermissions(memberXuid);
    const newPerms = await sendPermissionForm(target, currentPerms);
    if (newPerms === undefined) {
        return;
    }
    // Check perms
    const canEdit = (group.getOwner() === targetXuid ||
        group.isCoOwner(targetXuid) ||
        target.getCommandPermissionLevel() === command_2.CommandPermissionLevel.Operator);
    if (!canEdit) {
        target.sendMessage(`§cYou dont have permission to edit player perms!`);
        return;
    }
    group.setMemberPermissions(memberXuid, newPerms);
    (0, storageManager_1.saveData)();
    target.sendMessage(`§aUpdated permissions!`);
}
function sendPlayerBlocks(target) {
    const targetXuid = target.getXuid();
    const output = getCheckBlocksResultString(targetXuid);
    target.sendMessage(output);
}
function getCheckBlocksResultString(xuid) {
    const maxBlocks = (0, claimBlocksManager_1.getPlayerMaxBlocks)(xuid);
    const freeBlock = (0, claimBlocksManager_1.getPlayerFreeBlocks)(xuid);
    return `§aYou have §e${freeBlock}§a free blocks out of §e${maxBlocks}§a!`;
}
async function sendClaimCommandSimpleForm(target) {
    const buttons = [];
    const actionIds = [];
    if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.editClaimCommandEnabled) {
        buttons.push(new form_1.FormButton("Edit Existing Claim or Group"));
        actionIds.push("edit");
    }
    if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.giveWandCommandEnabled) {
        buttons.push(new form_1.FormButton("Get Claim Wand"));
        actionIds.push("wand");
    }
    if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.checkBlocksCommandEnabled) {
        buttons.push(new form_1.FormButton("Check Block Balance"));
        actionIds.push("blocks");
    }
    if (configManager_1.CONFIG.commandOptions.claim.subcommandOptions.cancelClaimCreationCommandEnabled) {
        buttons.push(new form_1.FormButton("Cancel Claim Creation"));
        actionIds.push("cancel");
    }
    if (buttons.length === 0) {
        target.sendMessage("§cClaim command disabled!");
        return;
    }
    const form = new form_1.SimpleForm("Claim Command", "Select an Option:", buttons);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            switch (actionIds[data.response]) {
                case "edit":
                    await handleEditCommand(target);
                    break;
                case "wand":
                    handleWandCommand(target);
                    break;
                case "blocks":
                    sendPlayerBlocks(target);
                    break;
                case "cancel":
                    handleCancelClaim(target);
                    break;
            }
            resolve(undefined);
        });
    });
}
function handleCancelClaim(executor) {
    const executorXuid = executor.getXuid();
    const res = (0, claimBuilder_1.cancelClaim)(executorXuid);
    switch (res) {
        case claimBuilder_1.CancelClaimResult.NotABuilder:
            let errorMsg = (0, overideTextSystem_1.getOverriddenText)("claim.cancel.error");
            if (errorMsg === undefined) {
                errorMsg = '§cYou are not creating a claim!';
            }
            executor.sendMessage(errorMsg);
            break;
        case claimBuilder_1.CancelClaimResult.Success:
            let successMsg = (0, overideTextSystem_1.getOverriddenText)("claim.cancel.success");
            if (successMsg === undefined) {
                successMsg = '§aClaim creation cancelled!';
            }
            executor.sendMessage(successMsg);
            break;
    }
}
exports.handleCancelClaim = handleCancelClaim;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1Db21tYW5kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhaW1Db21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHNDQUFrQztBQUNsQyxvREFBd0M7QUFDeEMsMENBQXFDO0FBRXJDLG9DQUF5RDtBQUN6RCwyQ0FXeUI7QUFDekIsd0NBQTZFO0FBQzdFLHNDQUFpQztBQUNqQyw4REFBcUU7QUFDckUsNkVBQTBGO0FBQzFGLDhDQUF3RDtBQUN4RCw0Q0FBNEM7QUFDNUMscUVBQXFGO0FBQ3JGLHlEQUE2RjtBQUM3RixJQUFPLFNBQVMsR0FBRyxhQUFLLENBQUMsU0FBUyxDQUFDO0FBQ25DLGlEQUEyRztBQUMzRyw0REFBdUQ7QUFFdkQsY0FBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFO0lBQ3RCLE1BQU0sa0JBQWtCLEdBQUcsc0JBQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO0lBRXZELElBQUksa0JBQWtCLENBQUMsU0FBUyxFQUFFO1FBQzlCLE1BQU0sWUFBWSxHQUFHLGlCQUFPO2FBQ3ZCLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsOEJBQThCLENBQUMsQ0FBQztRQUU5RSxLQUFLLE1BQU0sS0FBSyxJQUFJLGtCQUFrQixDQUFDLE9BQU8sRUFBRTtZQUM1QyxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzdCO1FBRUQsSUFBSSxrQkFBa0IsQ0FBQyxnQkFBZ0IsRUFBRTtZQUNyQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDekMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLENBQUMsQ0FBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsUUFBUSxFQUFFLENBQUEsRUFBRTtvQkFDckIsTUFBTSxDQUFDLEtBQUssQ0FB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