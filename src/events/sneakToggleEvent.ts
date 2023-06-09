import {fireEvent, registerEvent, registerEventType} from "@bdsx/claim-pilot/src/events/eventStorage";
import {ServerPlayer} from "bdsx/bds/player";
import {events} from "bdsx/event";

export namespace SneakToggleEvent {
    export const ID = 'SneakToggleEvent';
    export const CANCELABLE = false;
    export type CALLBACK = (player: ServerPlayer) => void;

    export function register(callback: CALLBACK) {
        registerEvent(SneakToggleEvent.ID, callback);
    }

    export function handleFireCallbacks(callbacks: CALLBACK[], data: any) {
        for (const callback of callbacks) {
            callback(data.player);
        }
    }
}

registerEventType(SneakToggleEvent);

events.entitySneak.on((ev) => {
    if (ev.entity.isPlayer() && !ev.isSneaking) {
        fireEvent(SneakToggleEvent.ID, {player: ev.entity});
    }
})