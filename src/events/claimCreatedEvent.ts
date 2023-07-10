import {Claim} from "../claims/claim";
import {registerEvent, registerEventType} from "./eventStorage";

export namespace ClaimCreationEvent {
    export const ID = 'ClaimCreationEvent';
    export const CANCELABLE = true;
    export const ASYNC_ALLOWED = true;
    export type CALLBACK = (claim: Claim, ownerXuid: string) => Promise<boolean> | boolean;

    export function register(callback: CALLBACK) {
        registerEvent(ID, callback);
    }

    export async function handleFireCallbacks(callbacks: CALLBACK[], data: any) {
        let shouldExecute = true;
        for (const callback of callbacks) {
            const callbackResult = callback(data.claim, data.ownerXuid);
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

registerEventType(ClaimCreationEvent);
