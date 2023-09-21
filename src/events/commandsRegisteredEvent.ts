import {registerEvent, registerEventType} from "./eventStorage";

export namespace CommandsRegisteredEvent {
    export const ID = 'CommandsRegisteredEvent';
    export const CANCELABLE = false;
    export const ASYNC_ALLOWED = true;
    export type CALLBACK = () => Promise<void> | void;

    export function register(callback: CALLBACK) {
        registerEvent(ID, callback);
    }

    export async function handleFireCallbacks(callbacks: CALLBACK[], _data: any) {
        for (const callback of callbacks) {
            const callbackResult = callback();
            if (callbackResult instanceof Promise) {
                await callbackResult;
            }
        }
    }
}

registerEventType(CommandsRegisteredEvent);
