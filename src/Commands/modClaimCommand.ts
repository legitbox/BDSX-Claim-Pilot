import {events} from "bdsx/event";
import {CONFIG} from "../configManager";
import {command} from "bdsx/command";
import {CommandPermissionLevel, PlayerCommandSelector} from "bdsx/bds/command";
import {bool_t, int32_t} from "bdsx/nativetype";
import {
    isPlayerServerBuilder,
    PlayerServerBuilderToggleResult,
    setPlayerServerBuilderState
} from "../claims/claimBuilder";
import {
    addToMaxBlocks,
    getPlayerFreeBlocks,
    getPlayerMaxBlocks,
    removeFromMaxBlocks,
    setMaxBlocks
} from "../claims/claimBlocksManager";
import {ServerPlayer} from "bdsx/bds/player";
import {FormButton, SimpleForm} from "bdsx/bds/form";
import {decay} from "bdsx/decay";
import {
    sendSelectOnlinePlayerForm,
    sendTextInputForm,
    sendTwoChoiceForm,
    TwoChoiceFormResult
} from "./commandUtils";
import isDecayed = decay.isDecayed;
import {getName} from "../Storage/storageManager";

events.serverOpen.on(() => {
    const fclaimCommandConfig = CONFIG.commandOptions.fclaim;

    if (fclaimCommandConfig.isEnabled) {
        const fclaimCommand = command
            .register(
                fclaimCommandConfig.commandName,
                "Moderator command for claims",
                CommandPermissionLevel.Operator
            );

        for (let alias of fclaimCommandConfig.aliases) {
            fclaimCommand.alias(alias);
        }

        if (fclaimCommandConfig.quickFormEnabled) {
            fclaimCommand
                .overload((_p, origin, output) => {
                    const player = origin.getEntity();
                    if (!player?.isPlayer()) {
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
                    if (!player?.isPlayer()) {
                        output.error("Command needs to be ran by a player!");
                        return;
                    }

                    handleToggleServerClaimBuilder(player, params.value);
                }, {
                    options: command.enum("options.serverbuilder", "serverbuilder"),
                    value: [bool_t, true],
                })
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
                            newValue = addToMaxBlocks(target.getXuid(), params.count);
                        } else if (params.operation === "remove") {
                            newValue = removeFromMaxBlocks(target.getXuid(), params.count);
                        } else {
                            newValue = setMaxBlocks(target.getXuid(), params.count);
                        }
                        const newMax = addToMaxBlocks(target.getXuid(), params.count);

                        let message = `§e${target.getName()}§a now has §e${newMax}§a max blocks!`;
                        if (params.operation === "remove") {
                            message += "\n§eNote: Not the amount you expected? The max block count can't fall below the default block count!"
                        } else if (params.operation === "set") {
                            message += "\n§eNote: Not the amount you expected? The max block count can't be set below the default block count!"
                        }

                        output.success(`§e${target.getName()}§a now has §e${newMax}§a max blocks!`);
                    }
                }, {
                    options: command.enum("options.blocks", "blocks"),
                    operation: command.enum("options.operation", ["add", "remove", "set"]),
                    target: PlayerCommandSelector,
                    count: int32_t,
                });

            fclaimCommand
                .overload((params, origin, output) => {
                    const targets = params.target.newResults(origin);

                    if (targets.length === 0) {
                        output.error("No targets matched selector!");
                    }

                    for (const target of targets) {
                        const blockCount = getPlayerMaxBlocks(target.getXuid());
                        const freeBlocks = getPlayerFreeBlocks(target.getXuid());

                        output.success(`§e${target.getName()}§a has §e${blockCount}§a max blocks with §e${freeBlocks}§a blocks free!`);
                    }
                }, {
                    options: command.enum("options.blocks", "blocks"),
                    operation: command.enum("options.operation", "query"),
                    target: PlayerCommandSelector,
                })
        }
    }
})

async function sendModClaimCommandForm(target: ServerPlayer) {
    const fclaimCommandConfig = CONFIG.commandOptions.fclaim;

    const buttons: FormButton[] = [];
    const actionIds: string[] = [];

    if (fclaimCommandConfig.subcommandOptions.editPlayerBlocksCommandEnabled) {
        buttons.push(new FormButton("Manage Player Blocks"));
        actionIds.push("edit_player");
    }

    if (fclaimCommandConfig.subcommandOptions.serverClaimCreationModeToggleCommandEnabled) {
        buttons.push(new FormButton("Toggle Server Claim Creation Mode"));
        actionIds.push("toggle_server_builder");
    }

    if (buttons.length === 0) {
        target.sendMessage(`§cNo form options to choose from!`);
        return;
    }

    const form = new SimpleForm("Moderator Claim Options", "Select an Option:", buttons);

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
                    const selectedPlayer = await sendSelectOnlinePlayerForm(target);
                    if (selectedPlayer === undefined) {
                        break;
                    }

                    await handleEditPlayerOptions(target, selectedPlayer);
            }

            resolve(undefined);
        })
    });
}

async function handleEditPlayerOptions(target: ServerPlayer, playerXuid: string) {
    const form = new SimpleForm("Player Blocks Options", "Select an Option:", [
        new FormButton("Add Max Blocks to Player"),
        new FormButton("Remove Max Blocks from Player"),
        new FormButton("Set Max Blocks for Player"),
        new FormButton("Query Player Max Blocks"),
    ]);

    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }

            const targetXuid = target.getXuid();
            const targetMaxBlocks = getPlayerMaxBlocks(playerXuid);
            const targetName = getName(playerXuid);

            let count;
            let newMax: number | undefined = undefined;
            switch (data.response) {
                case 0:
                    count = await sendNumberInputForm(
                        target,
                        "Enter Amount to Add",
                        "Enter blocks to add:",
                        0,
                    )

                    if (count === undefined) {
                        break;
                    }

                    newMax = addToMaxBlocks(targetXuid, count);
                    break;
                case 1:
                    count = await sendNumberInputForm(
                        target,
                        "Enter Amount to Remove",
                        "Enter blocks to remove:",
                        0,
                    )

                    if (count === undefined) {
                        break;
                    }

                    newMax = removeFromMaxBlocks(targetXuid, count);
                    break;
                case 2:
                    count = await sendNumberInputForm(
                        target,
                        "Enter Amount to Set",
                        "Enter Max Blocks:",
                        targetMaxBlocks,
                    )

                    if (count === undefined) {
                        break;
                    }

                    newMax = setMaxBlocks(targetXuid, count);
                    break;
                case 3:
                    const targetFreeBlocks = getPlayerFreeBlocks(playerXuid);

                    target.sendMessage(`§e${targetName}§a has §e${targetMaxBlocks}§a max blocks and has §e${targetFreeBlocks}§a blocks free!`);
                    return;
            }

            if (newMax !== undefined) {
                let message = `§e${targetName}§a now has §e${newMax}§a max blocks!`;
                if (data.response === 1) {
                    message += "\n§eNote: Not the amount you expected? The max block count can't fall below the default block count!"
                } else if (data.response === 2) {
                    message += "\n§eNote: Not the amount you expected? The max block count can't be set below the default block count!"
                }

                target.sendMessage(message);
            }

            resolve(undefined);
        })
    })
}

function handleToggleServerClaimBuilder(target: ServerPlayer, value: boolean = !isPlayerServerBuilder(target.getXuid())) {
    const xuid = target.getXuid();

    const toggleResult = setPlayerServerBuilderState(xuid, value);

    switch (toggleResult) {
        case PlayerServerBuilderToggleResult.Success:
            if (value) {
                target.sendMessage("§aYou are now a server builder!");
            } else {
                target.sendMessage("§aYou are no longer a server builder!");
            }
            break;
        case PlayerServerBuilderToggleResult.AlreadyBuilder:
            target.sendMessage("§cYou were already a server builder!");
            break;
        case PlayerServerBuilderToggleResult.AlreadyNotBuilder:
            target.sendMessage("§cYou were already not a server builder!");
            break;
        case PlayerServerBuilderToggleResult.AlreadyBuildingClaim:
            target.sendMessage("§cYou cant change your builder state while making a claim!");
    }
}

async function sendNumberInputForm(target: ServerPlayer, title: string, description: string, defaultCount?: number,): Promise<number | undefined> {
    let retry = true;
    let value: number | undefined = undefined;
    while (retry) {
        const input = await sendTextInputForm(
            target,
            title,
            description,
            defaultCount?.toString(),
            defaultCount?.toString(),
        )

        if (input === undefined) {
            return undefined;
        }

        const inputedNum = parseInt(input);
        if (isNaN(inputedNum)) {
            const res = await sendTwoChoiceForm(
                target,
                "Inputed Number Error",
                "Inputed Number cant be parsed as a number, retry?",
                "Yes",
                "No",
            );

            if (res !== TwoChoiceFormResult.OptionOne) {
                break;
            } else {
                continue;
            }
        }

        value = inputedNum;
        retry = false;
    }

    return value;
}