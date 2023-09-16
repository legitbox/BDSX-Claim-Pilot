"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
            switch (actionIds[data.response]) {
                case "toggle_server_builder":
                    handleToggleServerClaimBuilder(target);
                    break;
                case "edit_player":
                    const selectedPlayer = await (0, commandUtils_1.sendSelectOnlinePlayerForm)(target);
                    if (selectedPlayer === undefined) {
                        break;
                    }
                    await handleEditPlayerOptions(target, selectedPlayer);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kQ2xhaW1Db21tYW5kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibW9kQ2xhaW1Db21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBQWtDO0FBQ2xDLG9EQUF3QztBQUN4QywwQ0FBcUM7QUFDckMsOENBQStFO0FBQy9FLGdEQUFnRDtBQUNoRCx5REFJZ0M7QUFDaEMscUVBTXNDO0FBRXRDLHdDQUFxRDtBQUNyRCxzQ0FBaUM7QUFDakMsaURBS3dCO0FBQ3hCLElBQU8sU0FBUyxHQUFHLGFBQUssQ0FBQyxTQUFTLENBQUM7QUFDbkMsOERBQWtEO0FBRWxELGNBQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRTtJQUN0QixNQUFNLG1CQUFtQixHQUFHLHNCQUFNLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQztJQUV6RCxJQUFJLG1CQUFtQixDQUFDLFNBQVMsRUFBRTtRQUMvQixNQUFNLGFBQWEsR0FBRyxpQkFBTzthQUN4QixRQUFRLENBQ0wsbUJBQW1CLENBQUMsV0FBVyxFQUMvQiw4QkFBOEIsRUFDOUIsZ0NBQXNCLENBQUMsUUFBUSxDQUNsQyxDQUFDO1FBRU4sS0FBSyxJQUFJLEtBQUssSUFBSSxtQkFBbUIsQ0FBQyxPQUFPLEVBQUU7WUFDM0MsYUFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUM5QjtRQUVELElBQUksbUJBQW1CLENBQUMsZ0JBQWdCLEVBQUU7WUFDdEMsYUFBYTtpQkFDUixRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUM3QixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxDQUFBLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxRQUFRLEVBQUUsQ0FBQSxFQUFFO29CQUNyQixNQUFNLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7b0JB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