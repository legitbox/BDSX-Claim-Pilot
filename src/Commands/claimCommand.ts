import {events} from "bdsx/event";
import {CONFIG} from "../configManager";
import {command} from "bdsx/command";
import {ServerPlayer} from "bdsx/bds/player";
import {createWand, getNumOfBlocksInBox} from "../utils";
import {
    Claim,
    ClaimGroup,
    createGroup,
    CreateGroupOptions,
    deleteClaim,
    deleteClaimGroup,
    getEditableClaims,
    getEditableGroups,
    getOwnedClaims, getOwnedGroups,
    getPlayerPermissionState
} from "../claims/claim";
import {CustomForm, FormButton, FormToggle, SimpleForm} from "bdsx/bds/form";
import {decay} from "bdsx/decay";
import {getName, saveData, setName} from "../Storage/storageManager";
import {ClaimPermission, getClaimPermissionDatas} from "../claims/claimPermissionManager";
import {CommandPermissionLevel} from "bdsx/bds/command";
import {bedrockServer} from "bdsx/launcher";
import {getPlayerFreeBlocks, getPlayerMaxBlocks} from "../claims/claimBlocksManager";
import {cancelClaim, CancelClaimResult, isPlayerServerBuilder} from "../claims/claimBuilder";
import isDecayed = decay.isDecayed;
import {selectPlayerForm, sendTextInputForm, sendTwoChoiceForm, TwoChoiceFormResult} from "./commandUtils";

events.serverOpen.on(() => {
    const claimCommandConfig = CONFIG.commandOptions.claim;

    if (claimCommandConfig.isEnabled) {
        const claimCommand = command
            .register(claimCommandConfig.commandName, "Command for managing claims!");

        for (const alias of claimCommandConfig.aliases) {
            claimCommand.alias(alias);
        }

        if (claimCommandConfig.quickFormEnabled) {
            claimCommand.overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (!player?.isPlayer()) {
                    output.error("Command needs to be ran by a player!");
                    return;
                }

                sendClaimCommandSimpleForm(player).then();
            }, {});
        }

        if (claimCommandConfig.subcommandOptions.giveWandCommandEnabled) {
            claimCommand.overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (!player?.isPlayer()) {
                    output.error("Command needs to be ran by a player!");
                    return;
                }

                handleWandCommand(player);
            }, {
                options: command.enum('options.wand', 'wand'),
            })
        }

        if (claimCommandConfig.subcommandOptions.editClaimCommandEnabled) {
            claimCommand.overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (!player?.isPlayer()) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }

                handleEditCommand(player).then();
            }, {
                options: command.enum('options.edit', 'edit'),
            })
        }

        if (claimCommandConfig.subcommandOptions.cancelClaimCreationCommandEnabled) {
            claimCommand.overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (!player?.isPlayer()) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }

                const playerXuid = player.getXuid();
                const res = cancelClaim(playerXuid);

                switch (res) {
                    case CancelClaimResult.NotABuilder:
                        output.error('You are not creating a claim!');
                        break;
                    case CancelClaimResult.Success:
                        output.success('§aClaim creation cancelled!');
                        break;
                }
            }, {
                options: command.enum('options.cancel', 'cancel'),
            })
        }

        if (claimCommandConfig.subcommandOptions.checkBlocksCommandEnabled) {
            claimCommand.overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (!player?.isPlayer()) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }

                sendPlayerBlocks(player);
            }, {
                options: command.enum('options.blocks', 'blocks'),
            });
        }
    }
});

const wandCooldownMap: Map<string, number> = new Map();

function handleWandCommand(executor: ServerPlayer) {
    const xuid = executor.getXuid();
    const lastRequestTime = wandCooldownMap.get(xuid);

    const now = Date.now();
    if (lastRequestTime !== undefined && now - lastRequestTime <= CONFIG.giveWandCooldown) {
        executor.sendMessage(`§cYou need to wait ${Math.floor((CONFIG.giveWandCooldown - (now - lastRequestTime))/1000)} more seconds before requesting a new wand!`);
        return;
    }

    const wandItem = createWand();
    const didAdd = executor.getInventory().addItem(wandItem, true);
    if (!didAdd) {
        executor.sendMessage(`§cYou dont have enough free space for the wand!`);
        return;
    }

    executor.sendInventory();

    wandCooldownMap.set(xuid, now);

    executor.sendMessage(`§aWand given!`)
}

async function handleEditCommand(executor: ServerPlayer) {
    // Select Claim/Group selection
    const res = await sendTwoChoiceForm(
        executor,
        "Select Search Type",
        "Select whether you want to edit your claims or groups",
        "Claims",
        "Groups",
    )

    switch (res) {
        case TwoChoiceFormResult.Cancel:
            return;
        case TwoChoiceFormResult.OptionOne:
            handleEditClaimForm(executor).then();
            break;
        case TwoChoiceFormResult.OptionTwo:
            handleEditGroupForm(executor).then();
            break;
    }
}

async function handleEditGroupForm(target: ServerPlayer) {
    const targetXuid = target.getXuid();

    const ret = await sendTwoChoiceForm(
        target,
        "Group Choice",
        "Select an Option",
        "Create a Group",
        "Edit an Existing Group",
    );

    if (ret === TwoChoiceFormResult.Cancel) {
        return;
    } else if (ret === TwoChoiceFormResult.OptionOne) {
        await sendCreateGroupForm(target);
        return;
    }

    let groups;
    if (isPlayerServerBuilder(targetXuid)) {
        groups = getOwnedGroups("SERVER");
    } else {
        groups = getEditableGroups(targetXuid);
    }

    const selectedGroup = await selectGroupForm(target, groups);
    if (selectedGroup === undefined) {
        return;
    }

    const buttons: FormButton[] = [];
    const actionIds: string[] = [];

    const isOp = target.getCommandPermissionLevel() === CommandPermissionLevel.Operator;
    const isOwner = selectedGroup.getOwner() === targetXuid;
    const isCoOwner = selectedGroup.isCoOwner(targetXuid);
    const canEditName = getPlayerPermissionState(selectedGroup, targetXuid, "edit_name") || isOp;

    if (canEditName) {
        buttons.push(new FormButton("Edit Group Name"));
        actionIds.push("edit_name");
    }

    if (canEditName) {
        buttons.push(new FormButton("Edit Grouped Claim"));
        actionIds.push("edit_claim");
    }

    if (isOp || isOwner || isCoOwner) {
        buttons.push(new FormButton("Edit Members"));
        actionIds.push("edit_members");
    }

    if (isOp || isOwner) {
        buttons.push(new FormButton("Delete"));
        actionIds.push("delete_group");
    }

    if (buttons.length === 0) {
        target.sendMessage("§cYou dont have permission to edit this group!");
        return;
    }

    const form = new SimpleForm(
        'Group Options',
        'Select An Option',
        buttons,
    )

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

                    let newName = await sendNameInputForm(
                        target,
                        "Group Name:",
                        currentName,
                        currentName,
                    )

                    if (newName === undefined) {
                        break;
                    }

                    if (
                        !getPlayerPermissionState(selectedGroup, targetXuid, "edit_name") &&
                        target.getCommandPermissionLevel() !== CommandPermissionLevel.Operator
                    ) {
                        target.sendMessage(`§cYou dont have permission to change this groups name!`);
                        break;
                    }

                    selectedGroup.setName(newName);
                    saveData();

                    target.sendMessage(`§aGroup name updated!`);
                    break;
                case "edit_members":
                    await editGroupMembersOptions(target, selectedGroup);

                    break;
                case "delete_group":
                    const ret = await sendTwoChoiceForm(
                        target,
                        "Delete Confirmation",
                        "§cAre you sure you want to delete this group?\n\n§eNote: §aThis wont delete the claims inside the group.\n§eNote: §aThis will update the grouped claims to match the groups perms",
                        "Yes",
                        "No"
                    );

                    if (ret !== TwoChoiceFormResult.OptionOne) {
                        break;
                    }

                    if (
                        target.getCommandPermissionLevel() !== CommandPermissionLevel.Operator &&
                        selectedGroup.getOwner() !== targetXuid
                    ) {
                        target.sendMessage("§cYou dont have permission to delete this group!");
                        break;
                    }

                    deleteClaimGroup(selectedGroup);
                    saveData();

                    target.sendMessage("§aGroup deleted!");
                    break;
            }

            resolve(undefined);
        })
    })
}

async function handleEditClaimForm(target: ServerPlayer) {
    const xuid = target.getXuid();
    let isServerBuilder = isPlayerServerBuilder(xuid);
    let claims;
    if (isServerBuilder) {
        claims = getOwnedClaims("SERVER", false);
    } else {
        claims = getEditableClaims(target.getXuid(), false);
    }

    const selectedClaim = await selectClaimForm(target, claims);
    if (selectedClaim === undefined) {
        return;
    }

    const buttons: FormButton[] = [];
    const actionIds: string[] = [];

    const isOp = target.getCommandPermissionLevel() === CommandPermissionLevel.Operator;

    if (isOp || getPlayerPermissionState(selectedClaim, xuid, "edit_name")) {
        buttons.push(new FormButton("Set Claim Name"));
        actionIds.push("edit_name");
    }

    const isOwner = selectedClaim.getOwner() === xuid
    if (isOp || isOwner || selectedClaim.isCoOwner(xuid)) {
        buttons.push(new FormButton("Edit Members"));
        actionIds.push("edit_members");
    }

    if (isOp || isOwner) {
        buttons.push(new FormButton("Delete"));
        actionIds.push("delete_claim");
    }

    if (buttons.length === 0) {
        target.sendMessage("§cYou dont have permission to edit this claim!");
        return;
    }

    const centerPos = selectedClaim.getCenterPoint();
    const form = new SimpleForm("Claim Options", `Select an option:\nClaim Pos: (X: ${Math.floor(centerPos.x)}, Y: ${Math.floor(centerPos.y)}, Z: ${Math.floor(centerPos.z)})`, buttons);

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

                    let newName = await sendNameInputForm(
                        target,
                        "Claim Name:",
                        currentName,
                        currentName,
                    )

                    if (newName === undefined) {
                        resolve(undefined);
                        return;
                    } else {
                        // Checking target perms one last time
                        if (
                            target.getCommandPermissionLevel() !== CommandPermissionLevel.Operator &&
                            !getPlayerPermissionState(selectedClaim, playerXuid, "edit_name")
                        ) {
                            target.sendMessage('§cYou dont have permission to set the claim name!');
                            resolve(undefined);
                            return;
                        }

                        selectedClaim.setName(newName);
                        saveData();

                        target.sendMessage(`§aSet claim name to §e${newName}`);
                        resolve(undefined);
                        return;
                    }
                case "edit_members":
                    editClaimMembersOptions(target, selectedClaim).then();

                    resolve(undefined);
                    break;
                case "delete_claim":
                    const ret = await sendTwoChoiceForm(
                        target,
                        "Delete Confirmation",
                        `Are you sure you want to delete this claim?\nThis will free ${getNumOfBlocksInBox(selectedClaim.cornerOne, selectedClaim.cornerEight)} blocks.`,
                        "Yes",
                        "No",
                    );

                    if (ret !== TwoChoiceFormResult.OptionOne) {
                        resolve(undefined);
                        return;
                    }

                    const canDelete = target.getCommandPermissionLevel() === CommandPermissionLevel.Operator || selectedClaim.getOwner() === playerXuid;
                    if (!canDelete) {
                        target.sendMessage(`§cYou dont have permission to delete this claim!`);
                        resolve(undefined);
                        return;
                    }

                    deleteClaim(selectedClaim);

                    target.sendMessage(`§aClaim Deleted`);

                    resolve(undefined);
                    return;
            }
        })
    })
}

async function sendCreateGroupForm(target: ServerPlayer) {
    const targetXuid: string = target.getXuid();
    const targetName: string = target.getName();

    const isServerBuilder = isPlayerServerBuilder(targetXuid);
    const defaultName = isServerBuilder ? "Server Group" : `${targetName}'s Group`;
    const groupName = await sendNameInputForm(
        target,
        "Group Name:",
        defaultName,
        defaultName,
    );

    if (groupName === undefined) {
        return;
    }

    let claims;
    if (isServerBuilder) {
        claims = getOwnedClaims("SERVER", false);
    } else {
        claims = getOwnedClaims(targetXuid, false);
    }

    const selectedClaim = await selectClaimForm(
        target,
        claims,
        "Select a Claim",
        "Select the first claim for this group:",
    );

    if (selectedClaim === undefined) {
        return;
    }

    const options: CreateGroupOptions = {
        initialClaims: [selectedClaim],
    }

    const ownerXuid = isServerBuilder ? "SERVER" : targetXuid;


    await createGroup(
        groupName,
        ownerXuid,
        options,
    )

    target.sendMessage("§aGroup Created!");
}

async function sendNameInputForm(
    target: ServerPlayer,
    description: string,
    placeholderValue? :string,
    defaultValue? :string,
): Promise<string | undefined> {
    let newName: string | undefined = undefined;
    let retry = true;
    while (retry) {
        let attemptedName = await sendTextInputForm(
            target,
            "Enter New Name",
            description,
            placeholderValue,
            defaultValue,
        );

        if (attemptedName === undefined) {
            return;
        }

        if (attemptedName.trim() === "") {
            // Blank Error
            const ret = await sendTwoChoiceForm(target, "Error With Name", "Name cant be blank!\nRetry?", "Yes", "No");
            retry = ret === TwoChoiceFormResult.OptionOne;
            continue;
        }

        newName = attemptedName;
        retry = false;
    }

    return newName;
}

async function selectGroupForm(target: ServerPlayer, groups: ClaimGroup[]): Promise<ClaimGroup | undefined> {
    if (groups.length === 0) {
        target.sendMessage(`§cNo groups to choose from!`);
        return;
    }

    const buttons: FormButton[] = [];
    for (const group of groups) {
        buttons.push(new FormButton(group.getName()));
    }

    const form = new SimpleForm("Select Group", "Select a group:", buttons);

    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }

            resolve(groups[data.response]);
        })
    })
}

async function selectClaimForm(
    target: ServerPlayer,
    claims: Claim[],
    title: string = "Select Claim",
    description: string = "Select a claim:",
    ignoreGroup: boolean = false,
): Promise<Claim | undefined> {
    if (claims.length === 0) {
        target.sendMessage('§cNo claims to choose from!');
        return;
    }

    const buttons: FormButton[] = [];
    for (const claim of claims) {
        buttons.push(new FormButton(claim.getName(ignoreGroup)));
    }

    const form = new SimpleForm(title, description, buttons);

    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
            }

            resolve(claims[data.response]);
        })
    })
}

async function editGroupMembersOptions(target: ServerPlayer, group: ClaimGroup) {
    const buttons: FormButton[] = [new FormButton("Edit an existing member")];
    const actionIds: string[] = ["edit_member"];

    if (target.getCommandPermissionLevel() === CommandPermissionLevel.Operator || group.getOwner() === target.getXuid()) {
        buttons.push(new FormButton("Add a member"));
        actionIds.push("add_member");
    }

    const form = new SimpleForm('Group Member Options', "Choose and Option", buttons);

    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }

            switch (actionIds[data.response]) {
                case "add_member":
                    const onlinePlayers = bedrockServer.level.getPlayers();
                    const onlineXuids: string[] = [];
                    for (const player of onlinePlayers) {
                        const xuid = player.getXuid();

                        if (xuid === target.getXuid()) {
                            continue;
                        }

                        const name = getName(xuid);
                        if (name === undefined) {
                            setName(xuid, player.getName());
                        }

                        onlineXuids.push(xuid);
                    }

                    const selectedPlayer = await selectPlayerForm(
                        target,
                        onlineXuids,
                        "Select a Member",
                        "Choose a member to edit:",
                    )

                    if (selectedPlayer === undefined) {
                        break;
                    }

                    if (
                        target.getCommandPermissionLevel() !== CommandPermissionLevel.Operator &&
                        group.getOwner() !== target.getXuid()
                    ) {
                        target.sendMessage("§cYou dont have permission to add a member to this claim!");
                        break;
                    }

                    group.setMemberPermissions(selectedPlayer, new Map());
                    saveData();

                    target.sendMessage("§aAdded player!");
                    break;
                case "edit_member":
                    const members = group.getMemberXuids();
                    const selectedMember = await selectPlayerForm(
                        target,
                        members,
                        "Select a Member",
                        "Select a member to edit:",
                    )

                    if (selectedMember === undefined) {
                        break;
                    }

                    await editGroupMemberOptions(target, group, selectedMember);

                    break;
            }

            resolve(undefined);
        })
    })
}

async function editClaimMembersOptions(target: ServerPlayer, claim: Claim) {
    const buttons: FormButton[] = [new FormButton("Edit an existing member")];
    const actionIds: string[] = ["edit_member"];

    if (target.getCommandPermissionLevel() === CommandPermissionLevel.Operator || claim.getOwner() === target.getXuid()) {
        buttons.push(new FormButton("Add a member"));
        actionIds.push("add_member");
    }

    const form = new SimpleForm("Claim Member Options", "Choose an Option", buttons);

    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }

            switch (actionIds[data.response]) {
                case "add_member":
                    const onlinePlayers = bedrockServer.level.getPlayers();
                    const onlinePlayerXuids: string[] = [];
                    for (const player of onlinePlayers) {
                        const xuid = player.getXuid();
                        if (xuid === target.getXuid()) {
                            continue;
                        }

                        const memberPerm = claim.getMemberPermissions(xuid);

                        if (memberPerm !== undefined || claim.isCoOwner(xuid) || claim.getOwner() === xuid) {
                            continue;
                        }

                        let name = getName(xuid);
                        if (name === undefined) {
                            name = player.getName();
                            setName(xuid, name);
                        }

                        onlinePlayerXuids.push(xuid);
                    }

                    const selectedPlayer = await selectPlayerForm(
                        target,
                        onlinePlayerXuids,
                        "Select a Player",
                        "Select a Player to add to this claim",
                    )

                    if (selectedPlayer === undefined) {
                        resolve(undefined);
                        return;
                    }

                    const name = getName(selectedPlayer);
                    const ret = await sendTwoChoiceForm(
                        target,
                        "Add Member Confirmation",
                        `Are you sure you want to add ${name} as a member to this claim?`,
                        "Yes",
                        "No",
                    );

                    if (ret !== TwoChoiceFormResult.OptionOne) {
                        resolve(undefined);
                        return;
                    }

                    const canAdd = (target.getCommandPermissionLevel() === CommandPermissionLevel.Operator || claim.getOwner() === target.getXuid());
                    if (!canAdd) {
                        target.sendMessage(`§cYou dont have permission to add a player to this claim!`);
                        resolve(undefined);
                        return;
                    }

                    claim.setMemberPermissions(selectedPlayer, new Map());
                    saveData();

                    target.sendMessage('§aPlayer added as member to claim!');

                    resolve(undefined);
                    return;
                case "edit_member":
                    const memberXuids = claim.getMemberXuids();
                    const memberXuid = await selectPlayerForm(target, memberXuids, "Select a Member", "Choose the member you want to edit:");

                    if (memberXuid === undefined) {
                        resolve(undefined);
                        return;
                    }

                    await editClaimMemberOptions(target, claim, memberXuid);

                    resolve(undefined);
                    return;
            }
        })
    })
}

function getButtonsForEditMemberOptions(target: ServerPlayer, group: ClaimGroup | Claim, memberXuid: string): any[] | undefined {
    const targetXuid = target.getXuid();

    const isOwnerOrOp = group.getOwner() === targetXuid || target.getCommandPermissionLevel() === CommandPermissionLevel.Operator
    if (!isOwnerOrOp && !group.isCoOwner(targetXuid)) {
        target.sendMessage(`§cYou dont have permission to modify members!`);
        return;
    }

    const buttons: FormButton[] = [];
    const actionIds: string[] = [];

    const memberIsCoOwner = group.isCoOwner(memberXuid);

    if (isOwnerOrOp) {
        buttons.push(new FormButton("Remove Player"));
        actionIds.push("delete_player");

        if (memberIsCoOwner) {
            buttons.push(new FormButton("Remove Co-Owner"));
            actionIds.push("remove_admin");
        } else {
            buttons.push(new FormButton("Make Co-Owner"));
            actionIds.push("give_admin");
        }
    }

    if ((isOwnerOrOp || group.isCoOwner(targetXuid)) && !memberIsCoOwner) {
        buttons.push(new FormButton("Edit Permissions"))
        actionIds.push("edit_perms");
    }

    if (buttons.length === 0) {
        target.sendMessage(`§cYou dont have permission to edit this player!`);
        return;
    }

    return [buttons, actionIds];
}

async function editGroupMemberOptions(target: ServerPlayer, group: ClaimGroup, memberXuid: string) {
    const targetXuid = target.getXuid();

    const ret = getButtonsForEditMemberOptions(target, group, memberXuid);
    if (ret === undefined) {
        return;
    }

    const [buttons, actionIds] = ret;

    const form = new SimpleForm(
        'Edit Member',
        'Select an Option',
        buttons,
    )

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
                    ret = await sendTwoChoiceForm(
                        target,
                        "Remove Co-Owner Confirmation",
                        `Are you sure you want to remove Co-Owner from ${getName(memberXuid)}?`,
                        "Yes",
                        "No",
                    )

                    if (ret !== TwoChoiceFormResult.OptionOne) {
                        break;
                    }

                    if (
                        group.getOwner() !== targetXuid &&
                        target.getCommandPermissionLevel() !== CommandPermissionLevel.Operator
                    ) {
                        target.sendMessage("§cYou dont have permission to remove Co-Owner from members");
                        break;
                    }

                    group.removeCoOwner(memberXuid);
                    saveData();

                    target.sendMessage("§aSuccessfully removed Co-Owner from player!");

                    break;
                case "give_admin":
                    ret = await sendTwoChoiceForm(
                        target,
                        "Give Co-Owner Confirmation",
                        `Are you sure you want to make ${getName(memberXuid)} a Co-Owner?`,
                        "Yes",
                        "No",

                    )

                    if (ret !== TwoChoiceFormResult.OptionOne) {
                        break;
                    }

                    if (
                        group.getOwner() !== targetXuid &&
                        target.getCommandPermissionLevel() !== CommandPermissionLevel.Operator
                    ) {
                        target.sendMessage("§cYou dont have permission to make members a Co-Owner!");
                        break;
                    }

                    group.addCoOwner(memberXuid);
                    saveData();

                    target.sendMessage("§aPlayer is now a Co-Owner!");
                    break;
                case "delete_player":
                    ret = await sendTwoChoiceForm(
                        target,
                        "Removal Confirmation",
                        "Remove player from Group",
                        "Yes",
                        "No",
                    );

                    if (ret !== TwoChoiceFormResult.OptionOne) {
                        break;
                    }

                    if (group.getOwner() !== targetXuid && target.getCommandPermissionLevel() !== CommandPermissionLevel.Operator) {
                        target.sendMessage("§cYou dont have permission to remove players from this group!");
                        break;
                    }

                    group.removeMember(memberXuid);
                    saveData();

                    target.sendMessage("§aSuccessfully deleted player!");

                    break;
            }

            resolve(undefined);
        })
    })
}

async function editClaimMemberOptions(target: ServerPlayer, claim: Claim, memberXuid: string) {
    const targetXuid = target.getXuid();

    const ret = getButtonsForEditMemberOptions(target, claim, memberXuid);
    if (ret === undefined) {
        return undefined;
    }

    const [buttons, actionIds] = ret;

    const form = new SimpleForm("Edit Member", "Select an Option", buttons);

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
                    saveData();

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
                    saveData();

                    target.sendMessage(`§aPlayer is no longer a Co-Owner!`);
                    resolve(undefined);
                    break;
                case "delete_player":
                    const memberName = getName(memberXuid);
                    // Send confirmation box
                    const res = await sendTwoChoiceForm(target, "Remove Confirmation", `Are you sure you want to remove ${memberName} from this claim?`, "Yes", "No");
                    if (res !== TwoChoiceFormResult.OptionOne) {
                        resolve(undefined);
                        return;
                    }

                    // Final permissions check
                    const canDelete = claim.getOwner() === targetXuid || target.getCommandPermissionLevel() === CommandPermissionLevel.Operator;
                    if (!canDelete) {
                        target.sendMessage('§cYou dont have permission to remove players from this claim!');
                        resolve(undefined);
                        return;
                    }

                    if (claim.isCoOwner(memberXuid)) {
                        claim.removeCoOwner(memberXuid);
                    }

                    claim.removeMember(memberXuid);
                    saveData();

                    target.sendMessage(`§e${memberName}§a removed!`);

                    resolve(undefined);
                    break;
                case "edit_perms":
                    await editMemberPerms(target, memberXuid, claim);

                    resolve(undefined);
                    break;
            }
        })
    })
}

async function sendPermissionForm(target: ServerPlayer, currentPermissions: ClaimPermission = new Map(), title: string = "Edit Permissions"): Promise<ClaimPermission | undefined> {
    const permDatas = getClaimPermissionDatas();
    const toggles: FormToggle[] = [];
    for (const permData of permDatas) {
        let defaultValue = currentPermissions.get(permData.permissionName);
        if (defaultValue === undefined) {
            defaultValue = permData.defaultValue;
        }

        toggles.push(new FormToggle(permData.optionName, defaultValue));
    }

    const form = new CustomForm(title, toggles);

    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }

            const newPermMap: ClaimPermission = new Map();
            for (let i = 0; i < data.response.length; i++) {
                const permData = permDatas[i];
                const value = data.response[i];

                newPermMap.set(permData.permissionName, value);
            }

            resolve(newPermMap);
        })
    })
}

async function editGroupClaimOptions(target: ServerPlayer, group: ClaimGroup) {
    const buttons: FormButton[] = [];
    const actionIds: string[] = [];
    
    const targetXuid = target.getXuid();
    
    const isOp = target.getCommandPermissionLevel() === CommandPermissionLevel.Operator;
    const isOwner = group.getOwner() === targetXuid;
    const canEditName = getPlayerPermissionState(group, targetXuid, "edit_players") || isOp;

    if (isOwner || canEditName) {
        buttons.push(new FormButton("Edit Existing Claim"));
        actionIds.push("edit_claim");
    }

    if (isOwner || isOp) {
        buttons.push(new FormButton("Add Claim"));
        actionIds.push("add_claim");
    }

    if (buttons.length === 0) {
        target.sendMessage("§cYou dont have permission to edit any claims!");
        return;
    }

    const form = new SimpleForm(
        "Group Claim Options",
        "Select an Option:",
        buttons,
    )

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
                    if (isPlayerServerBuilder(targetXuid)) {
                        claims = getOwnedClaims("SERVER", false);
                    } else {
                        claims = getOwnedClaims(targetXuid, false);
                    }
                    const selectedClaim = await selectClaimForm(target, claims, undefined, undefined, true);

                    if (selectedClaim === undefined) {
                        break;
                    }

                    if (
                        target.getCommandPermissionLevel() !== CommandPermissionLevel.Operator &&
                        group.getOwner() !== targetXuid
                    ) {
                        target.sendMessage("§cYou dont have permission to add claims to this group!");
                        break;
                    }

                    group.addClaim(selectedClaim, true);
                    saveData();

                    target.sendMessage("§aSuccessfully added claim to group!");
                    break;
            }

            resolve(undefined);
        })
    })
}

async function editGroupClaim(target: ServerPlayer, group: ClaimGroup) {
    const claims = group.getClaims();
    const selectedClaim = await selectClaimForm(target, claims, undefined, undefined, true);

    if (selectedClaim === undefined) {
        return;
    }

    const buttons: FormButton[] = [];
    const actionIds: string[] = [];

    const targetXuid = target.getXuid();

    const isOp = target.getCommandPermissionLevel() === CommandPermissionLevel.Operator;

    if (isOp || getPlayerPermissionState(group, targetXuid, "edit_name")) {
        buttons.push(new FormButton("Edit Sub-Name"));
        actionIds.push("edit_name");
    }

    if (isOp || group.getOwner() === targetXuid) {
        buttons.push(new FormButton("Remove Claim From Group"));
        actionIds.push("remove_claim");
        buttons.push(new FormButton("Delete Claim"));
        actionIds.push("delete_claim");
    }
    
    if (buttons.length === 0) {
        target.sendMessage("§cYou dont have permission to edit this claim!");
        return;
    }

    const centerPoint = selectedClaim.getCenterPoint();
    
    const form = new SimpleForm(
        "Grouped Claim Options",
        `Location: (X: ${Math.floor(centerPoint.x)} Y: ${Math.floor(centerPoint.y)} Z: ${Math.floor(centerPoint.z)})\nSelect an Option:`,
        buttons,
    )
    
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }

            let ret;

            switch (actionIds[data.response]) {
                case "delete_claim":
                    ret = await sendTwoChoiceForm(
                        target,
                        "Delete Confirmation",
                        "Are you sure you want to delete this claim?",
                        "Yes",
                        "No"
                    )

                    if (ret !== TwoChoiceFormResult.OptionOne) {
                        break;
                    }

                    if (
                        target.getCommandPermissionLevel() !== CommandPermissionLevel.Operator &&
                        group.getOwner() !== targetXuid
                    ) {
                        target.sendMessage("§cYou dont have permission to delete that claim!");
                        break;
                    }

                    group.removeClaim(selectedClaim);
                    deleteClaim(selectedClaim);

                    break;
                case "remove_claim":
                    ret = await sendTwoChoiceForm(
                        target,
                        "Remove Confirmation",
                        "Do you want to remove this claim from the group?\n\nNote: This wont delete the claim",
                        "Yes",
                        "No"
                    )

                    if (ret !== TwoChoiceFormResult.OptionOne) {
                        break;
                    }

                    if (
                        target.getCommandPermissionLevel() !== CommandPermissionLevel.Operator &&
                        group.getOwner() !== targetXuid
                    ) {
                        target.sendMessage("§cYou dont have permission to remove that claim!");
                        break;
                    }

                    group.removeClaim(selectedClaim);
                    saveData();

                    target.sendMessage("§aSuccessfully removed claim from group!");

                    break;
                case "edit_name":
                    const currentName = selectedClaim.getName(true);
                    const name = await sendNameInputForm(
                        target,
                        "Claim Sub-Name:",
                        currentName,
                        currentName,
                    )

                    if (name === undefined) {
                        break;
                    }

                    if (
                        target.getCommandPermissionLevel() !== CommandPermissionLevel.Operator &&
                        !getPlayerPermissionState(group, targetXuid, "edit_name")
                    ) {
                        target.sendMessage("§cYou dont have permission to change this groups name!");
                    }

                    selectedClaim.setName(name, true);
                    saveData();

                    target.sendMessage("Updated Claim Sub-Name");

                    break;
            }

            resolve(undefined);
        })
    })
}

async function editMemberPerms(target: ServerPlayer, memberXuid: string, group: Claim | ClaimGroup) {
    const targetXuid = target.getXuid();

    const currentPerms = group.getMemberPermissions(memberXuid);
    const newPerms = await sendPermissionForm(target, currentPerms);

    if (newPerms === undefined) {
        return;
    }

    // Check perms
    const canEdit = (
        group.getOwner() === targetXuid ||
        group.isCoOwner(targetXuid) ||
        target.getCommandPermissionLevel() === CommandPermissionLevel.Operator
    );

    if (!canEdit) {
        target.sendMessage(`§cYou dont have permission to edit player perms!`);
        return;
    }

    group.setMemberPermissions(memberXuid, newPerms);
    saveData();

    target.sendMessage(`§aUpdated permissions!`);
}

function sendPlayerBlocks(target: ServerPlayer) {
    const targetXuid = target.getXuid();
    const output = getCheckBlocksResultString(targetXuid);

    target.sendMessage(output);
}

function getCheckBlocksResultString(xuid: string) {
    const maxBlocks = getPlayerMaxBlocks(xuid);
    const freeBlock = getPlayerFreeBlocks(xuid);

    return `§aYou have §e${freeBlock}§a free blocks out of §e${maxBlocks}§a!`;
}

async function sendClaimCommandSimpleForm(target: ServerPlayer) {
    const buttons: FormButton[] = [];
    const actionIds: string[] = [];

    if (CONFIG.commandOptions.claim.subcommandOptions.editClaimCommandEnabled) {
        buttons.push(new FormButton("Edit Existing Claim or Group"));
        actionIds.push("edit");
    }

    if (CONFIG.commandOptions.claim.subcommandOptions.giveWandCommandEnabled) {
        buttons.push(new FormButton("Get Claim Wand"));
        actionIds.push("wand");
    }

    if (CONFIG.commandOptions.claim.subcommandOptions.checkBlocksCommandEnabled) {
        buttons.push(new FormButton("Check Block Balance"));
        actionIds.push("blocks");
    }

    if (CONFIG.commandOptions.claim.subcommandOptions.cancelClaimCreationCommandEnabled) {
        buttons.push(new FormButton("Cancel Claim Creation"));
        actionIds.push("cancel");
    }

    if (buttons.length === 0) {
        target.sendMessage("§cClaim command disabled!");
        return;
    }

    const form = new SimpleForm(
        "Claim Command",
        "Select an Option:",
        buttons,
    );

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
                    const res = cancelClaim(playerXuid);

                    switch (res) {
                        case CancelClaimResult.NotABuilder:
                            target.sendMessage('§cYou are not creating a claim!');
                            break;
                        case CancelClaimResult.Success:
                            target.sendMessage('§aClaim creation cancelled!');
                            break;
                    }

                    break;
            }

            resolve(undefined)
        })
    })
}