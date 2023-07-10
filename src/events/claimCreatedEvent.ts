import {Claim} from "../claims/claim";
import {registerEvent, registerEventType} from "./eventStorage";
import {box} from "blessed";

export namespace ClaimCreationEvent {
    export const ID = 'ClaimCreationEvent';
    export const CANCELABLE = true;
    export const ASYNC_ALLOWED = true;
    export type CALLBACK = (claim: Claim, ownerXuid: string) => Promise<ClaimCreationExtraData> | ClaimCreationExtraData;

    export function register(callback: CALLBACK) {
        registerEvent(ID, callback);
    }

    export async function handleFireCallbacks(callbacks: CALLBACK[], data: any) {
        let shouldExecute = true;
        for (const callback of callbacks) {
            const callbackResult = callback(data.claim, data.ownerXuid);
            let extraData;
            if (callbackResult instanceof Promise) {
                extraData = await callbackResult;
            } else {
                extraData = callbackResult;
            }

            claimCreationExtraData.set(data.claim.id, extraData);

            let res = extraData.shouldCreate;

            if (res !== undefined && !res) {
                shouldExecute = false;
            }
        }

        return shouldExecute;
    }
}

export interface ClaimCreationExtraData {
    shouldCreate: boolean;
    shouldSendDefaultMessage: boolean;
}

function createDefaultClaimCreateExtraData(): ClaimCreationExtraData {
    return {
        shouldCreate: true,
        shouldSendDefaultMessage: true,
    }
}

// A bit of an iffy system if multiple plugins want to do things for this.
// The latest update is the one that gets used so it's very unreliable as to when an extra data will be chosen and from where.
// Though it's not likely that a plugin wrapping the claim creation system will be compatible with another doing the same.
// If something gets reported I might try and figure out some priority system
const claimCreationExtraData: Map<string, ClaimCreationExtraData> = new Map();

export function getExtraData(claimId: string, shouldRemove: boolean = true) {
    let res = claimCreationExtraData.get(claimId);
    if (res === undefined) {
        res = createDefaultClaimCreateExtraData();
    }

    if (shouldRemove) {
        claimCreationExtraData.delete(claimId);
    }

    return res;
}

registerEventType(ClaimCreationEvent);
