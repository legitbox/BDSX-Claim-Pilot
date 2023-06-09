import {PlayerTimeInfo} from "@bdsx/claim-pilot/src/playerPlaytime/playtime";
import {registerEvent, registerEventType} from "@bdsx/claim-pilot/src/events/eventStorage";

export namespace PlaytimeUpdateEvent {
    export const ID = 'PlaytimeUpdateEvent';
    export const CANCELABLE = false;
    export type CALLBACK = (xuid: string, playtimeInfo: PlayerTimeInfo) => void;

    export function register(callback: CALLBACK) {
        registerEvent(PlaytimeUpdateEvent.ID, callback);
    }

    export function handleFireCallbacks(callbacks: CALLBACK[], data: any) {
        for (const callback of callbacks) {
            callback(data.xuid, data.playtimeInfo);
        }
    }
}

registerEventType(PlaytimeUpdateEvent);