import {ClaimGroup} from "../claims/claim";
import {registerEvent, registerEventType} from "./eventStorage";

export namespace GroupCreatedEvent {
    export const ID = 'GroupCreatedEvent';
    export const CANCELABLE = true;
    export type CALLBACK = (group: ClaimGroup, ownerXuid: string) => boolean;

    export function register(callback: CALLBACK) {
        registerEvent(ID, callback);
    }

    export function handleFireCallbacks(callbacks: CALLBACK[], data: any) {
        let shouldExecute = true;
        for (const callback of callbacks) {
            const res = callback(data.group, data.ownerXuid);
            if (!res) {
                shouldExecute = false;
            }
        }

        return shouldExecute;
    }
}

registerEventType(GroupCreatedEvent);
