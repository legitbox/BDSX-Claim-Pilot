import {events} from "bdsx/event";
import {CONFIG, sendConfigForm} from "../configManager";
import {command} from "bdsx/command";
import {CommandPermissionLevel} from "bdsx/bds/command";

events.serverOpen.on(() => {
    const configCommandConfig = CONFIG.commandOptions.config;

    if (configCommandConfig.isEnabled) {
        let configCommand = command.register(
            CONFIG.commandOptions.config.commandName,
            'Command for editing the config!',
            CommandPermissionLevel.Operator
        );

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