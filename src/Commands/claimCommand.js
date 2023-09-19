"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWandCommand = void 0;
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
                const playerXuid = player.getXuid();
                const res = (0, claimBuilder_1.cancelClaim)(playerXuid);
                switch (res) {
                    case claimBuilder_1.CancelClaimResult.NotABuilder:
                        let errorMsg = (0, overideTextSystem_1.getOverriddenText)("claim.cancel.error");
                        if (errorMsg === undefined) {
                            errorMsg = 'You are not creating a claim!';
                        }
                        output.error(errorMsg);
                        break;
                    case claimBuilder_1.CancelClaimResult.Success:
                        let successMsg = (0, overideTextSystem_1.getOverriddenText)("claim.cancel.success");
                        if (successMsg === undefined) {
                            successMsg = '§aClaim creation cancelled!';
                        }
                        output.success(successMsg);
                        break;
                }
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
    const canEditName = (0, claim_1.getPlayerPermissionState)(selectedGroup, targetXuid, "edit_name") || isOp;
    if (canEditName) {
        buttons.push(new form_1.FormButton("Edit Group Name"));
        actionIds.push("edit_name");
    }
    if (canEditName) {
        buttons.push(new form_1.FormButton("Edit Grouped Claim"));
        actionIds.push("edit_claim");
    }
    if (isOp || isOwner || isCoOwner) {
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
    if (isOp || (0, claim_1.getPlayerPermissionState)(selectedClaim, xuid, "edit_name")) {
        buttons.push(new form_1.FormButton("Set Claim Name"));
        actionIds.push("edit_name");
    }
    const isOwner = selectedClaim.getOwner() === xuid;
    if (isOp || isOwner || selectedClaim.isCoOwner(xuid)) {
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
    const permDatas = (0, claimPermissionManager_1.getClaimPermissionDatas)();
    const toggles = [];
    for (const permData of permDatas) {
        let defaultValue = currentPermissions.get(permData.permissionName);
        if (defaultValue === undefined) {
            defaultValue = permData.defaultValue;
        }
        toggles.push(new form_1.FormToggle(permData.optionName, defaultValue));
    }
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
                    const playerXuid = target.getXuid();
                    const res = (0, claimBuilder_1.cancelClaim)(playerXuid);
                    switch (res) {
                        case claimBuilder_1.CancelClaimResult.NotABuilder:
                            target.sendMessage('§cYou are not creating a claim!');
                            break;
                        case claimBuilder_1.CancelClaimResult.Success:
                            target.sendMessage('§aClaim creation cancelled!');
                            break;
                    }
                    break;
            }
            resolve(undefined);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1Db21tYW5kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhaW1Db21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHNDQUFrQztBQUNsQyxvREFBd0M7QUFDeEMsMENBQXFDO0FBRXJDLG9DQUF5RDtBQUN6RCwyQ0FXeUI7QUFDekIsd0NBQTZFO0FBQzdFLHNDQUFpQztBQUNqQyw4REFBcUU7QUFDckUsNkVBQTBGO0FBQzFGLDhDQUF3RDtBQUN4RCw0Q0FBNEM7QUFDNUMscUVBQXFGO0FBQ3JGLHlEQUE2RjtBQUM3RixJQUFPLFNBQVMsR0FBRyxhQUFLLENBQUMsU0FBUyxDQUFDO0FBQ25DLGlEQUEyRztBQUMzRyw0REFBdUQ7QUFFdkQsY0FBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFO0lBQ3RCLE1BQU0sa0JBQWtCLEdBQUcsc0JBQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO0lBRXZELElBQUksa0JBQWtCLENBQUMsU0FBUyxFQUFFO1FBQzlCLE1BQU0sWUFBWSxHQUFHLGlCQUFPO2FBQ3ZCLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsOEJBQThCLENBQUMsQ0FBQztRQUU5RSxLQUFLLE1BQU0sS0FBSyxJQUFJLGtCQUFrQixDQUFDLE9BQU8sRUFBRTtZQUM1QyxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzdCO1FBRUQsSUFBSSxrQkFBa0IsQ0FBQyxnQkFBZ0IsRUFBRTtZQUNyQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDekMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLENBQUMsQ0FBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsUUFBUSxFQUFFLENBQUEsRUFBRTtvQkFDckIsTUFBTSxDQUFDLEtBQUssQ0FB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