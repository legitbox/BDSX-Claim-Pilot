import {PlayerTimeInfo} from "../playerPlaytime/playtime";
import {registerEvent, registerEventType} from "./eventStorage";

export namespace PlaytimeUpdateEvent {
    export const ID = 'PlaytimeUpdateEvent';
    export const CANCELABLE = false;
    export const ASYNC_ALLOWED = true;
    export type CALLBACK = (xuid: string, playtimeInfo: PlayerTimeInfo) => Promise<void> | void;

    export function register(callback: CALLBACK) {
        registerEvent(PlaytimeUpdateEvent.ID, callback);
    }

    export async function handleFireCallbacks(callbacks: CALLBACK[], data: any) {
        for (const callback of callbacks) {
            const callbackResult = callback(data.xuid, data.playtimeInfo);
            if (callbackResult instanceof Promise) {
                await callbackResult;
            }
        }
    }
}

registerEventType(PlaytimeUpdateEvent);
