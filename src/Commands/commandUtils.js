"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSelectOnlinePlayerForm = exports.sendTwoChoiceForm = exports.TwoChoiceFormResult = exports.sendTextInputForm = exports.selectPlayerForm = void 0;
const form_1 = require("bdsx/bds/form");
const storageManager_1 = require("../Storage/storageManager");
const decay_1 = require("bdsx/decay");
var isDecayed = decay_1.decay.isDecayed;
const launcher_1 = require("bdsx/launcher");
async function selectPlayerForm(target, xuids, title = "Select a Player", description = "") {
    if (xuids.length === 0) {
        target.sendMessage(`§cNo players found`);
        return;
    }
    const buttons = [];
    for (let xuid of xuids) {
        const name = (0, storageManager_1.getName)(xuid);
        if (name === undefined) {
            target.sendMessage(`§cError with claim member! Contact an admin and ask them to check server console!`);
            throw `ERROR: Cant generate button for xuid! No Stored Name\nErrored XUID: ${xuid}\nContact @SacriGrape on discord if this is persistent`.red;
        }
        buttons.push(new form_1.FormButton(name));
    }
    const form = new form_1.SimpleForm(title, description, buttons);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            const xuid = xuids[data.response];
            resolve(xuid);
        });
    });
}
exports.selectPlayerForm = selectPlayerForm;
async function sendTextInputForm(target, title, description, placeholderValue, defaultValue) {
    const form = new form_1.CustomForm(title, [
        new form_1.FormInput(description, placeholderValue, defaultValue),
    ]);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }
            resolve(data.response[0]);
            return;
        });
    });
}
exports.sendTextInputForm = sendTextInputForm;
var TwoChoiceFormResult;
(function (TwoChoiceFormResult) {
    TwoChoiceFormResult[TwoChoiceFormResult["OptionOne"] = 0] = "OptionOne";
    TwoChoiceFormResult[TwoChoiceFormResult["OptionTwo"] = 1] = "OptionTwo";
    TwoChoiceFormResult[TwoChoiceFormResult["Cancel"] = 2] = "Cancel";
})(TwoChoiceFormResult = exports.TwoChoiceFormResult || (exports.TwoChoiceFormResult = {}));
async function sendTwoChoiceForm(target, title, description, optionOne, optionTwo) {
    const form = new form_1.SimpleForm(title, description, [
        new form_1.FormButton(optionOne),
        new form_1.FormButton(optionTwo),
    ]);
    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(TwoChoiceFormResult.Cancel);
                return;
            }
            resolve(data.response);
        });
    });
}
exports.sendTwoChoiceForm = sendTwoChoiceForm;
async function sendSelectOnlinePlayerForm(target) {
    const onlinePlayers = launcher_1.bedrockServer.level.getPlayers();
    const onlinePlayerXuids = [];
    for (const player of onlinePlayers) {
        onlinePlayerXuids.push(player.getXuid());
    }
    return await selectPlayerForm(target, onlinePlayerXuids);
}
exports.sendSelectOnlinePlayerForm = sendSelectOnlinePlayerForm;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZFV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29tbWFuZFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHdDQUE0RTtBQUM1RSw4REFBa0Q7QUFDbEQsc0NBQWlDO0FBQ2pDLElBQU8sU0FBUyxHQUFHLGFBQUssQ0FBQyxTQUFTLENBQUM7QUFDbkMsNENBQTRDO0FBRXJDLEtBQUssVUFBVSxnQkFBZ0IsQ0FBQyxNQUFvQixFQUFFLEtBQWUsRUFBRSxRQUFnQixpQkFBaUIsRUFBRSxjQUFzQixFQUFFO0lBQ3JJLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDcEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3pDLE9BQU87S0FDVjtJQUVELE1BQU0sT0FBTyxHQUFpQixFQUFFLENBQUM7SUFDakMsS0FBSyxJQUFJLElBQUksSUFBSSxLQUFLLEVBQUU7UUFDcEIsTUFBTSxJQUFJLEdBQUcsSUFBQSx3QkFBTyxFQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNCLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtZQUNwQixNQUFNLENBQUMsV0FBVyxDQUFDLG1GQUFtRixDQUFDLENBQUE7WUFDdkcsTUFBTSx1RUFBdUUsSUFBSSx3REFBd0QsQ0FBQyxHQUFHLENBQUM7U0FDako7UUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksaUJBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ3RDO0lBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxpQkFBVSxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFFekQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQzNCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNoRCxJQUFJLFNBQVMsQ0FB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