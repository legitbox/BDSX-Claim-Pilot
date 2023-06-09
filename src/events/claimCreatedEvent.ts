import {Claim} from "../claims/claim";
import {registerEvent, registerEventType} from "./eventStorage";

export namespace ClaimCreationEvent {
    export const ID = 'ClaimCreationEvent';
    export const CANCELABLE = true;
    export type CALLBACK = (claim: Claim, ownerXuid: string) => boolean;

    export function register(callback: CALLBACK) {
        registerEvent(ID, callback);
    }

    export function handleFireCallbacks(callbacks: CALLBACK[], data: any) {
        let shouldExecute = true;
        for (const callback of callbacks) {
            const res = callback(data.claim, data.ownerXuid);
            if (!res) {
                shouldExecute = false;
            }
        }

        return shouldExecute;
    }
}

registerEventType(ClaimCreationEvent);