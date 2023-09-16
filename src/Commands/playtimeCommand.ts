import {events} from "bdsx/event";
import {CONFIG} from "../configManager";
import {command} from "bdsx/command";
import {sendPlaytimeFormForPlayer} from "../playerPlaytime/playtime";
import {PlayerCommandSelector} from "bdsx/bds/command";
import {ServerPlayer} from "bdsx/bds/player";
import {FormButton, SimpleForm} from "bdsx/bds/form";
import {decay} from "bdsx/decay";
import isDecayed = decay.isDecayed;
import {sendSelectOnlinePlayerForm} from "./commandUtils";

events.serverOpen.on(() => {
    const playtimeCommandConfig = CONFIG.commandOptions.playtime;

    if (!playtimeCommandConfig.isEnabled) {
        return;
    }

    const playtimeCommand = command
        .register(playtimeCommandConfig.commandName, "Command for viewing Playtime");

    for (const alias of playtimeCommandConfig.aliases) {
        playtimeCommand.alias(alias);
    }

    if (playtimeCommandConfig.quickFormEnabled) {
        playtimeCommand
            .overload((_p, origin, output) => {
                const player = origin.getEntity();
                if (!player?.isPlayer()) {
                    output.error("This command needs to be ran by a player!");
                    return;
                }

                handlePlaytimeForm(player).then();
            }, {})
    }

    if (playtimeCommandConfig.subcommandOptions.checkPlaytimeCommandEnabled) {
        playtimeCommand
            .overload((_p, origin, output) => {
            const player = origin.getEntity();
            if (player === null || !player.isPlayer()) {
                output.error('This command needs to be ran by a player!');
                return;
            }

            const xuid = player.getXuid();
            sendPlaytimeFormForPlayer(xuid, xuid);
        }, {
            options: command.enum("options.query", "query"),
        });
    }

    if (playtimeCommandConfig.subcommandOptions.checkOtherPlayerPlaytimeCommandEnabled) {
        playtimeCommand
            .overload((params, origin, output) => {
                const player = origin.getEntity();
                if (player === null || !player.isPlayer()) {
                    output.error('Command needs to be ran by a player!');
                    return;
                }

                const xuid = player.getXuid();

                const targets = params.target.newResults(origin);
                if (targets.length > 1) {
                    output.error('You can only view one players playtime at a time!');
                    return;
                } else if (targets.length === 0) {
                    output.error('No targets matched selector!');
                    return;
                }

                sendPlaytimeFormForPlayer(xuid, targets[0].getXuid());
            }, {
                options: command.enum("options.query", "query"),
                target: PlayerCommandSelector,
            })
    }
})

async function handlePlaytimeForm(target: ServerPlayer) {
    const playtimeCommandConfig = CONFIG.commandOptions.playtime;

    const buttons: FormButton[] = [];
    const actionIds: string[] = [];

    if (playtimeCommandConfig.subcommandOptions.checkPlaytimeCommandEnabled) {
        buttons.push(new FormButton("Check Your Playtime"));
        actionIds.push("check_playtime");
    }

    if (playtimeCommandConfig.subcommandOptions.checkOtherPlayerPlaytimeCommandEnabled) {
        buttons.push(new FormButton("Check Another Players Playtime"));
        actionIds.push("check_anothers_playtime");
    }

    if (buttons.length === 0) {
        target.sendMessage("§cNo form options to choose from!");
        return;
    }

    const form = new SimpleForm(
        "Playtime Command Options",
        "Select an Option:",
        buttons,
    )

    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }

            const targetXuid = target.getXuid();

            switch (actionIds[data.response]) {
                case "check_playtime":
                    sendPlaytimeFormForPlayer(targetXuid, targetXuid);
                    break;
                case "check_anothers_playtime":
                    const selectedPlayer = await sendSelectOnlinePlayerForm(target);
                    if (selectedPlayer === undefined) {
                        break;
                    }

                    sendPlaytimeFormForPlayer(targetXuid, selectedPlayer);
                    break;
            }

            resolve(undefined);
        })
    })
}