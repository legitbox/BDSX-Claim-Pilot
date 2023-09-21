"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixPlayerBlocks = void 0;
const event_1 = require("bdsx/event");
const configManager_1 = require("../configManager");
const command_1 = require("bdsx/command");
const command_2 = require("bdsx/bds/command");
const nativetype_1 = require("bdsx/nativetype");
const claimBuilder_1 = require("../claims/claimBuilder");
const claimBlocksManager_1 = require("../claims/claimBlocksManager");
const form_1 = require("bdsx/bds/form");
const decay_1 = require("bdsx/decay");
const commandUtils_1 = require("./commandUtils");
var isDecayed = decay_1.decay.isDecayed;
const storageManager_1 = require("../Storage/storageManager");
const claim_1 = require("../claims/claim");
event_1.events.serverOpen.on(() => {
    const fclaimCommandConfig = configManager_1.CONFIG.commandOptions.fclaim;
    if (fclaimCommandConfig.isEnabled) {
        const fclaimCommand = command_1.command
            .register(fclaimCommandConfig.commandName, "Moderator command for claims", command_2.CommandPermissionLevel.Operator);
        for (let alias of fclaimCommandConfig.aliases) {
            fclaimCommand.alias(alias);
        }
        if (fclaimCommandConfig.quickFormEnabled) {
            fclaimCommand
                .overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (!(player === null || player === void 0 ? void 0 : player.isPlayer())) {
                    output.error("Command needs to be ran by a player!");
                    return;
                }
                sendModClaimCommandForm(player).then();
            }, {});
        }
        if (fclaimCommandConfig.subcommandOptions.serverClaimCreationModeToggleCommandEnabled) {
            fclaimCommand
                .overload((params, origin, output) => {
                const player = origin.getEntity();
                if (!(player === null || player === void 0 ? void 0 : player.isPlayer())) {
                    output.error("Command needs to be ran by a player!");
                    return;
                }
                handleToggleServerClaimBuilder(player, params.value);
            }, {
                options: command_1.command.enum("options.serverbuilder", "serverbuilder"),
                value: [nativetype_1.bool_t, true],
            });
        }
        if (fclaimCommandConfig.subcommandOptions.editPlayerBlocksCommandEnabled) {
            fclaimCommand
                .overload((params, origin, output) => {
                const targets = params.target.newResults(origin);
                if (targets.length === 0) {
                    output.error("No targets matched selector!");
                    return;
                }
                for (const target of targets) {
                    let newValue;
                    if (params.operation === "add") {
                        newValue = (0, claimBlocksManager_1.addToMaxBlocks)(target.getXuid(), params.count);
                    }
                    else if (params.operation === "remove") {
                        newValue = (0, claimBlocksManager_1.removeFromMaxBlocks)(target.getXuid(), params.count);
                    }
                    else {
                        newValue = (0, claimBlocksManager_1.setMaxBlocks)(target.getXuid(), params.count);
                    }
                    const newMax = (0, claimBlocksManager_1.addToMaxBlocks)(target.getXuid(), params.count);
                    let message = `§e${target.getName()}§a now has §e${newMax}§a max blocks!`;
                    if (params.operation === "remove") {
                        message += "\n§eNote: Not the amount you expected? The max block count can't fall below the default block count!";
                    }
                    else if (params.operation === "set") {
                        message += "\n§eNote: Not the amount you expected? The max block count can't be set below the default block count!";
                    }
                    output.success(`§e${target.getName()}§a now has §e${newMax}§a max blocks!`);
                }
            }, {
                options: command_1.command.enum("options.blocks", "blocks"),
                operation: command_1.command.enum("options.operation", ["add", "remove", "set"]),
                target: command_2.PlayerCommandSelector,
                count: nativetype_1.int32_t,
            });
            fclaimCommand
                .overload((params, origin, output) => {
                const targets = params.target.newResults(origin);
                if (targets.length === 0) {
                    output.error("No targets matched selector!");
                }
                for (const target of targets) {
                    const blockCount = (0, claimBlocksManager_1.getPlayerMaxBlocks)(target.getXuid());
                    const freeBlocks = (0, claimBlocksManager_1.getPlayerFreeBlocks)(target.getXuid());
                    output.success(`§e${target.getName()}§a has §e${blockCount}§a max blocks with §e${freeBlocks}§a blocks free!`);
                }
            }, {
                options: command_1.command.enum("options.blocks", "blocks"),
                operation: command_1.command.enum("options.operation", "query"),
                target: command_2.PlayerCommandSelector,
            });
        }
        if (fclaimCommandConfig.subcommandOptions.fixPlayerBlocksCommandEnabled) {
            fclaimCommand
                .overload((params, origin, output) => {
                const targets = params.target.newResults(origin);
                if (targets.length === 0) {
                    output.error("No targets matched selector");
                    return;
                }
                for (const target of targets) {
                    fixPlayerBlocks(target.getXuid());
                    output.success(`§e${target.getName()}'s§a block count has been updated based on their current claims!`);
                }
            }, {
                options: command_1.command.enum("options.fix", "fix"),
                target: command_2.PlayerCommandSelector,
            });
        }
    }
});
async function sendModClaimCommandForm(target) {
    const fclaimCommandConfig = configManager_1.CONFIG.commandOptions.fclaim;
    const buttons = [];
    const actionIds = [];
    if (fclaimCommandConfig.subcommandOptions.editPlayerBlocksCommandEnabled) {
        buttons.push(new form_1.FormButton("Manage Player Blocks"));
        actionIds.push("edit_player");
    }
    if (fclaimCommandConfig.subcommandOptions.serverClaimCreationModeToggleCommandEnabled) {
        buttons.push(new form_1.FormButton("Toggle Server Claim Creation Mode"));
        actionIds.push("toggle_server_builder");
    }
    if (fclaimCommandConfig.subcommandOptions.fixPlayerBlocksCommandEnabled) {
        buttons.push(new form_1.FormButton("Fix Player Block Count"));
        actionIds.push("fix_blocks");
    }
    if (buttons.length === 0) {
        target.sendMessage(`§cNo form options to choose from!`);
        return;
    }
    const form = new form_1.SimpleForm("Moderator Claim Options", "Select an Option:", buttons);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            let selectedPlayerXuid;
            switch (actionIds[data.response]) {
                case "fix_blocks":
                    selectedPlayerXuid = await (0, commandUtils_1.sendSelectOnlinePlayerForm)(target);
                    if (selectedPlayerXuid === undefined) {
                        break;
                    }
                    fixPlayerBlocks(selectedPlayerXuid);
                    target.sendMessage(`§e${(0, storageManager_1.getName)(selectedPlayerXuid)}'s§a block count has been updated based on their current claims!`);
                    break;
                case "toggle_server_builder":
                    handleToggleServerClaimBuilder(target);
                    break;
                case "edit_player":
                    selectedPlayerXuid = await (0, commandUtils_1.sendSelectOnlinePlayerForm)(target);
                    if (selectedPlayerXuid === undefined) {
                        break;
                    }
                    await handleEditPlayerOptions(target, selectedPlayerXuid);
            }
            resolve(undefined);
        });
    });
}
async function handleEditPlayerOptions(target, playerXuid) {
    const form = new form_1.SimpleForm("Player Blocks Options", "Select an Option:", [
        new form_1.FormButton("Add Max Blocks to Player"),
        new form_1.FormButton("Remove Max Blocks from Player"),
        new form_1.FormButton("Set Max Blocks for Player"),
        new form_1.FormButton("Query Player Max Blocks"),
    ]);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            const targetXuid = target.getXuid();
            const targetMaxBlocks = (0, claimBlocksManager_1.getPlayerMaxBlocks)(playerXuid);
            const targetName = (0, storageManager_1.getName)(playerXuid);
            let count;
            let newMax = undefined;
            switch (data.response) {
                case 0:
                    count = await sendNumberInputForm(target, "Enter Amount to Add", "Enter blocks to add:", 0);
                    if (count === undefined) {
                        break;
                    }
                    newMax = (0, claimBlocksManager_1.addToMaxBlocks)(targetXuid, count);
                    break;
                case 1:
                    count = await sendNumberInputForm(target, "Enter Amount to Remove", "Enter blocks to remove:", 0);
                    if (count === undefined) {
                        break;
                    }
                    newMax = (0, claimBlocksManager_1.removeFromMaxBlocks)(targetXuid, count);
                    break;
                case 2:
                    count = await sendNumberInputForm(target, "Enter Amount to Set", "Enter Max Blocks:", targetMaxBlocks);
                    if (count === undefined) {
                        break;
                    }
                    newMax = (0, claimBlocksManager_1.setMaxBlocks)(targetXuid, count);
                    break;
                case 3:
                    const targetFreeBlocks = (0, claimBlocksManager_1.getPlayerFreeBlocks)(playerXuid);
                    target.sendMessage(`§e${targetName}§a has §e${targetMaxBlocks}§a max blocks and has §e${targetFreeBlocks}§a blocks free!`);
                    return;
            }
            if (newMax !== undefined) {
                let message = `§e${targetName}§a now has §e${newMax}§a max blocks!`;
                if (data.response === 1) {
                    message += "\n§eNote: Not the amount you expected? The max block count can't fall below the default block count!";
                }
                else if (data.response === 2) {
                    message += "\n§eNote: Not the amount you expected? The max block count can't be set below the default block count!";
                }
                target.sendMessage(message);
            }
            resolve(undefined);
        });
    });
}
function handleToggleServerClaimBuilder(target, value = !(0, claimBuilder_1.isPlayerServerBuilder)(target.getXuid())) {
    const xuid = target.getXuid();
    const toggleResult = (0, claimBuilder_1.setPlayerServerBuilderState)(xuid, value);
    switch (toggleResult) {
        case claimBuilder_1.PlayerServerBuilderToggleResult.Success:
            if (value) {
                target.sendMessage("§aYou are now a server builder!");
            }
            else {
                target.sendMessage("§aYou are no longer a server builder!");
            }
            break;
        case claimBuilder_1.PlayerServerBuilderToggleResult.AlreadyBuilder:
            target.sendMessage("§cYou were already a server builder!");
            break;
        case claimBuilder_1.PlayerServerBuilderToggleResult.AlreadyNotBuilder:
            target.sendMessage("§cYou were already not a server builder!");
            break;
        case claimBuilder_1.PlayerServerBuilderToggleResult.AlreadyBuildingClaim:
            target.sendMessage("§cYou cant change your builder state while making a claim!");
    }
}
async function sendNumberInputForm(target, title, description, defaultCount) {
    let retry = true;
    let value = undefined;
    while (retry) {
        const input = await (0, commandUtils_1.sendTextInputForm)(target, title, description, defaultCount === null || defaultCount === void 0 ? void 0 : defaultCount.toString(), defaultCount === null || defaultCount === void 0 ? void 0 : defaultCount.toString());
        if (input === undefined) {
            return undefined;
        }
        const inputedNum = parseInt(input);
        if (isNaN(inputedNum)) {
            const res = await (0, commandUtils_1.sendTwoChoiceForm)(target, "Inputed Number Error", "Inputed Number cant be parsed as a number, retry?", "Yes", "No");
            if (res !== commandUtils_1.TwoChoiceFormResult.OptionOne) {
                break;
            }
            else {
                continue;
            }
        }
        value = inputedNum;
        retry = false;
    }
    return value;
}
// This will update the players `used blocks` to match the blocks used by their claims
// This is specifically going to be apart of a command, calling it via functions leads to issues when a claim has yet to be registered
function fixPlayerBlocks(playerXuid) {
    const ownedClaims = (0, claim_1.getOwnedClaims)(playerXuid);
    let totalBlocksUsed = 0;
    for (const claim of ownedClaims) {
        totalBlocksUsed += claim.totalBlocks();
    }
    (0, claimBlocksManager_1.setUsedBlocks)(playerXuid, totalBlocksUsed);
}
exports.fixPlayerBlocks = fixPlayerBlocks;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kQ2xhaW1Db21tYW5kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibW9kQ2xhaW1Db21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHNDQUFrQztBQUNsQyxvREFBd0M7QUFDeEMsMENBQXFDO0FBQ3JDLDhDQUErRTtBQUMvRSxnREFBZ0Q7QUFDaEQseURBSWdDO0FBQ2hDLHFFQU1zQztBQUV0Qyx3Q0FBcUQ7QUFDckQsc0NBQWlDO0FBQ2pDLGlEQUt3QjtBQUN4QixJQUFPLFNBQVMsR0FBRyxhQUFLLENBQUMsU0FBUyxDQUFDO0FBQ25DLDhEQUFrRDtBQUNsRCwyQ0FBK0M7QUFFL0MsY0FBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFO0lBQ3RCLE1BQU0sbUJBQW1CLEdBQUcsc0JBQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO0lBRXpELElBQUksbUJBQW1CLENBQUMsU0FBUyxFQUFFO1FBQy9CLE1BQU0sYUFBYSxHQUFHLGlCQUFPO2FBQ3hCLFFBQVEsQ0FDTCxtQkFBbUIsQ0FBQyxXQUFXLEVBQy9CLDhCQUE4QixFQUM5QixnQ0FBc0IsQ0FBQyxRQUFRLENBQ2xDLENBQUM7UUFFTixLQUFLLElBQUksS0FBSyxJQUFJLG1CQUFtQixDQUFDLE9BQU8sRUFBRTtZQUMzQyxhQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzlCO1FBRUQsSUFBSSxtQkFBbUIsQ0FBQyxnQkFBZ0IsRUFBRTtZQUN0QyxhQUFhO2lCQUNSLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQzdCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLENBQUEsTUFBTSxhQUFOLE1BQU0sdUJBQU4sTUFBTSxDQUFFLFFBQVEsRUFBRSxDQUFBLEVBQUU7b0JBQ3JCLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0NBQXND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