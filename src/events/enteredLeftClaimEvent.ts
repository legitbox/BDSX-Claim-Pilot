import {Claim} from "../claims/claim";
import {registerEvent, registerEventType} from "./eventStorage";

export namespace EnteredLeftClaimEvent {
    export const ID = 'EnteredLeftClaimEvent';
    export const CANCELABLE = false;
    export const ASYNC_ALLOWED = true;
    export type CALLBACK = (playerXuid: string, claim: Claim | undefined) => Promise<void> | void;

    export function register(callback: CALLBACK) {
        registerEvent(ID, callback);
    }

    export async function handleFireCallbacks(callbacks: CALLBACK[], data: any) {
        for (const callback of callbacks) {
            const callbackResult = callback(data.playerXuid, data.claim);
            if (callbackResult instanceof Promise) {
                await callbackResult;
            }
        }
    }
}

registerEventType(EnteredLeftClaimEvent);
