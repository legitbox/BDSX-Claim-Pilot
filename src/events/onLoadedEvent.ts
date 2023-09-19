import {registerEvent, registerEventType} from "./eventStorage";

export namespace ClaimPilotLoadedEvent {
    export const ID = 'ClaimPilotLoadedEvent';
    export const CANCELABLE = false;
    export const ASYNC_ALLOWED = true;
    export type CALLBACK = () => Promise<void> | void;

    export function register(callback: CALLBACK) {
        registerEvent(ID, callback);
    }

    export async function handleFireCallbacks(callbacks: CALLBACK[], data: any) {
        for (const callback of callbacks) {
            const callbackResult = callback();
            if (callbackResult instanceof Promise) {
                await callbackResult;
            }
        }
    }
}

registerEventType(ClaimPilotLoadedEvent);
