import {ServerPlayer} from "bdsx/bds/player";
import {CustomForm, FormButton, FormInput, SimpleForm} from "bdsx/bds/form";
import {getName} from "../Storage/storageManager";
import {decay} from "bdsx/decay";
import isDecayed = decay.isDecayed;
import {bedrockServer} from "bdsx/launcher";

export async function selectPlayerForm(target: ServerPlayer, xuids: string[], title: string = "Select a Player", description: string = ""): Promise<string | undefined> {
    if (xuids.length === 0) {
        target.sendMessage(`§cNo players found`);
        return;
    }

    const buttons: FormButton[] = [];
    for (let xuid of xuids) {
        const name = getName(xuid);
        if (name === undefined) {
            target.sendMessage(`§cError with claim member! Contact an admin and ask them to check server console!`)
            throw `ERROR: Cant generate button for xuid! No Stored Name\nErrored XUID: ${xuid}\nContact @SacriGrape on discord if this is persistent`.red;
        }

        buttons.push(new FormButton(name));
    }

    const form = new SimpleForm(title, description, buttons);

    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }

            const xuid = xuids[data.response];

            resolve(xuid);
        })
    })
}

export async function sendTextInputForm(
    target: ServerPlayer,
    title: string,
    description: string,
    placeholderValue?: string,
    defaultValue?: string
): Promise<string | undefined> {
    const form = new CustomForm(title, [
        new FormInput(description, placeholderValue, defaultValue),
    ]);

    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(undefined);
                return;
            }

            resolve(data.response[0]);
            return;
        })
    })
}

export enum TwoChoiceFormResult {
    OptionOne,
    OptionTwo,
    Cancel,
}

export async function sendTwoChoiceForm(
    target: ServerPlayer,
    title: string,
    description: string,
    optionOne: string,
    optionTwo: string
): Promise<TwoChoiceFormResult> {
    const form = new SimpleForm(title, description, [
        new FormButton(optionOne),
        new FormButton(optionTwo),
    ])

    return new Promise((resolve) => {
        form.sendTo(target.getNetworkIdentifier(), (data) => {
            if (isDecayed(target) || data.response == null) {
                resolve(TwoChoiceFormResult.Cancel);
                return;
            }

            resolve(data.response);
        });
    })
}

export async function sendSelectOnlinePlayerForm(target: ServerPlayer): Promise<string | undefined> {
    const onlinePlayers = bedrockServer.level.getPlayers();
    const onlinePlayerXuids: string[] = [];
    for (const player of onlinePlayers) {
        onlinePlayerXuids.push(player.getXuid());
    }

    return await selectPlayerForm(target, onlinePlayerXuids);
}