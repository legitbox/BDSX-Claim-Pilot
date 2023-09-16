"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_1 = require("bdsx/event");
const configManager_1 = require("../configManager");
const command_1 = require("bdsx/command");
const playtime_1 = require("../playerPlaytime/playtime");
const command_2 = require("bdsx/bds/command");
const form_1 = require("bdsx/bds/form");
const decay_1 = require("bdsx/decay");
var isDecayed = decay_1.decay.isDecayed;
const commandUtils_1 = require("./commandUtils");
event_1.events.serverOpen.on(() => {
    const playtimeCommandConfig = configManager_1.CONFIG.commandOptions.playtime;
    if (!playtimeCommandConfig.isEnabled) {
        return;
    }
    const playtimeCommand = command_1.command
        .register(playtimeCommandConfig.commandName, "Command for viewing Playtime");
    for (const alias of playtimeCommandConfig.aliases) {
        playtimeCommand.alias(alias);
    }
    if (playtimeCommandConfig.quickFormEnabled) {
        playtimeCommand
            .overload((_p, origin, output) => {
            const player = origin.getEntity();
            if (!(player === null || player === void 0 ? void 0 : player.isPlayer())) {
                output.error("This command needs to be ran by a player!");
                return;
            }
            handlePlaytimeForm(player).then();
        }, {});
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
            (0, playtime_1.sendPlaytimeFormForPlayer)(xuid, xuid);
        }, {
            options: command_1.command.enum("options.query", "query"),
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
            }
            else if (targets.length === 0) {
                output.error('No targets matched selector!');
                return;
            }
            (0, playtime_1.sendPlaytimeFormForPlayer)(xuid, targets[0].getXuid());
        }, {
            options: command_1.command.enum("options.query", "query"),
            target: command_2.PlayerCommandSelector,
        });
    }
});
async function handlePlaytimeForm(target) {
    const playtimeCommandConfig = configManager_1.CONFIG.commandOptions.playtime;
    const buttons = [];
    const actionIds = [];
    if (playtimeCommandConfig.subcommandOptions.checkPlaytimeCommandEnabled) {
        buttons.push(new form_1.FormButton("Check Your Playtime"));
        actionIds.push("check_playtime");
    }
    if (playtimeCommandConfig.subcommandOptions.checkOtherPlayerPlaytimeCommandEnabled) {
        buttons.push(new form_1.FormButton("Check Another Players Playtime"));
        actionIds.push("check_anothers_playtime");
    }
    if (buttons.length === 0) {
        target.sendMessage("§cNo form options to choose from!");
        return;
    }
    const form = new form_1.SimpleForm("Playtime Command Options", "Select an Option:", buttons);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), async (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            const targetXuid = target.getXuid();
            switch (actionIds[data.response]) {
                case "check_playtime":
                    (0, playtime_1.sendPlaytimeFormForPlayer)(targetXuid, targetXuid);
                    break;
                case "check_anothers_playtime":
                    const selectedPlayer = await (0, commandUtils_1.sendSelectOnlinePlayerForm)(target);
                    if (selectedPlayer === undefined) {
                        break;
                    }
                    (0, playtime_1.sendPlaytimeFormForPlayer)(targetXuid, selectedPlayer);
                    break;
            }
            resolve(undefined);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxheXRpbWVDb21tYW5kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicGxheXRpbWVDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBQWtDO0FBQ2xDLG9EQUF3QztBQUN4QywwQ0FBcUM7QUFDckMseURBQXFFO0FBQ3JFLDhDQUF1RDtBQUV2RCx3Q0FBcUQ7QUFDckQsc0NBQWlDO0FBQ2pDLElBQU8sU0FBUyxHQUFHLGFBQUssQ0FBQyxTQUFTLENBQUM7QUFDbkMsaURBQTBEO0FBRTFELGNBQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRTtJQUN0QixNQUFNLHFCQUFxQixHQUFHLHNCQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQztJQUU3RCxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxFQUFFO1FBQ2xDLE9BQU87S0FDVjtJQUVELE1BQU0sZUFBZSxHQUFHLGlCQUFPO1NBQzFCLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsOEJBQThCLENBQUMsQ0FBQztJQUVqRixLQUFLLE1BQU0sS0FBSyxJQUFJLHFCQUFxQixDQUFDLE9BQU8sRUFBRTtRQUMvQyxlQUFlLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ2hDO0lBRUQsSUFBSSxxQkFBcUIsQ0FBQyxnQkFBZ0IsRUFBRTtRQUN4QyxlQUFlO2FBQ1YsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUM3QixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLENBQUEsTUFBTSxhQUFOLE1BQU0sdUJBQU4sTUFBTSxDQUFFLFFBQVEsRUFBRSxDQUFBLEVBQUU7Z0JBQ3JCLE1BQU0sQ0FBQyxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQztnQkFDMUQsT0FBTzthQUNWO1lBRUQsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdEMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0tBQ2I7SUFFRCxJQUFJLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDLDJCQUEyQixFQUFFO1FBQ3JFLGVBQWU7YUFDVixRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ2pDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNsQyxJQUFJLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUU7Z0JBQ3ZDLE1BQU0sQ0FBQyxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQztnQkFDMUQsT0FBTzthQUNWO1lBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzlCLElBQUEsb0NBQXlCLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFDLENBQUMsRUFBRTtZQUNDLE9BQU8sRUFBRSxpQkFBTyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDO1NBQ2xELENBQUMsQ0FBQztLQUNOO0lBRUQsSUFBSSxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxzQ0FBc0MsRUFBRTtRQUNoRixlQUFlO2FBQ1YsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNqQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbEMsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUN2QyxNQUFNLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7Z0JBQ3JELE9BQU87YUFDVjtZQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUU5QixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUNwQixNQUFNLENBQUMsS0FBSyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7Z0JBQ2xFLE9BQU87YUFDVjtpQkFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUM3QixNQUFNLENBQUMsS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUM7Z0JBQzdDLE9BQU87YUFDVjtZQUVELElBQUEsb0NBQXlCLEVBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQzFELENBQUMsRUFBRTtZQUNDLE9BQU8sRUFBRSxpQkFBTyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDO1lBQy9DLE1BQU0sRUFBRSwrQkFBcUI7U0FDaEMsQ0FBQyxDQUFBO0tBQ1Q7QUFDTCxDQUFDLENBQUMsQ0FBQTtBQUVGLEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxNQUFvQjtJQUNsRCxNQUFNLHFCQUFxQixHQUFHLHNCQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQztJQUU3RCxNQUFNLE9BQU8sR0FBaUIsRUFBRSxDQUFDO0lBQ2pDLE1BQU0sU0FBUyxHQUFhLEVBQUUsQ0FBQztJQUUvQixJQUFJLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDLDJCQUEyQixFQUFFO1FBQ3JFLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxpQkFBVSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztRQUNwRCxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7S0FDcEM7SUFFRCxJQUFJLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDLHNDQUFzQyxFQUFFO1FBQ2hGLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxpQkFBVSxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztRQUMvRCxTQUFTLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7S0FDN0M7SUFFRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUN4RCxPQUFPO0tBQ1Y7SUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLGlCQUFVLENBQ3ZCLDBCQUEwQixFQUMxQixtQkFBbUIsRUFDbkIsT0FBTyxDQUNWLENBQUE7SUFFRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDdEQsSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLEVBQUU7Z0JBQzVDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDbkIsT0FBTzthQUNWO1lBRUQsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRXBDLFFBQVEsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDOUIsS0FBSyxnQkFBZ0I7b0JBQ2pCLElBQUEsb0NBQXlCLEVBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO29CQUNsRCxNQUFNO2dCQUNWLEtBQUsseUJBQXlCO29CQUMxQixNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUEseUNBQTBCLEVBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ2hFLElBQUksY0FBYyxLQUFLLFNBQVMsRUFBRTt3QkFDOUIsTUFBTTtxQkFDVDtvQkFFRCxJQUFBLG9DQUF5QixFQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztvQkFDdEQsTUFBTTthQUNiO1lBRUQsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUE7QUFDTixDQUFDIn0=