import {fireEvent, registerEvent, registerEventType} from "./eventStorage";
import {events} from "bdsx/event";

export namespace SneakToggleEvent {
    export const ID = 'SneakToggleEvent';
    export const CANCELABLE = false;
    export const ASYNC_ALLOWED = true;
    export type CALLBACK = (playerXuid: string) => Promise<void> | void;

    export function register(callback: CALLBACK) {
        registerEvent(SneakToggleEvent.ID, callback);
    }

    export async function handleFireCallbacks(callbacks: CALLBACK[], data: any) {
        for (const callback of callbacks) {
            const callbackResult = callback(data.playerXuid);
            if (callbackResult instanceof Promise) {
                await callbackResult;
            }
        }
    }
}

registerEventType(SneakToggleEvent);

events.entitySneak.on(async (ev) => {
    if (ev.entity.isPlayer() && !ev.isSneaking) {
        const eventRes = fireEvent(SneakToggleEvent.ID, {playerXuid: ev.entity.getXuid()});
        if (typeof eventRes !== "boolean") {
            await eventRes;
        }
    }
})
