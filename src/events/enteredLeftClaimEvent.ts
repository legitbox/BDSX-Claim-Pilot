import {Claim} from "@bdsx/claim-pilot/src/claims/claim";
import {ServerPlayer} from "bdsx/bds/player";
import {registerEvent, registerEventType} from "@bdsx/claim-pilot/src/events/eventStorage";

export namespace EnteredLeftClaimEvent {
    export const ID = 'EnteredLeftClaimEvent';
    export const CANCELABLE = false;
    export type CALLBACK = (player: ServerPlayer, claim: Claim | undefined) => void;

    export function register(callback: CALLBACK) {
        registerEvent(ID, callback);
    }

    export function handleFireCallbacks(callbacks: CALLBACK[], data: any) {
        for (const callback of callbacks) {
            callback(data.player, data.claim);
        }
    }
}

registerEventType(EnteredLeftClaimEvent);
