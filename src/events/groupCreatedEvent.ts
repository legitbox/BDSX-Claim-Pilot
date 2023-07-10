import {ClaimGroup} from "../claims/claim";
import {registerEvent, registerEventType} from "./eventStorage";

export namespace GroupCreatedEvent {
    export const ID = 'GroupCreatedEvent';
    export const CANCELABLE = true;
    export const ASYNC_ALLOWED = true;
    export type CALLBACK = (group: ClaimGroup, ownerXuid: string) => Promise<boolean> | boolean;

    export function register(callback: CALLBACK) {
        registerEvent(ID, callback);
    }

    export async function handleFireCallbacks(callbacks: CALLBACK[], data: any) {
        let shouldExecute = true;
        for (const callback of callbacks) {
            const callbackResult = callback(data.group, data.ownerXuid);
            let res: boolean;
            if (typeof callbackResult === "boolean") {
                res = callbackResult;
            } else {
                res = await callbackResult;
            }

            if (res !== undefined && !res) {
                shouldExecute = false;
            }
        }

        return shouldExecute;
    }
}

registerEventType(GroupCreatedEvent);
