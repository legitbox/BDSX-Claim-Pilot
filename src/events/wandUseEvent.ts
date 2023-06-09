import {BlockPos} from "bdsx/bds/blockpos";
import {fireEvent, registerEvent, registerEventType} from "@bdsx/claim-pilot/src/events/eventStorage";
import {CANCEL} from "bdsx/common";
import {events} from "bdsx/event";
import {CONFIG} from "@bdsx/claim-pilot/src/configManager";
import {ServerPlayer} from "bdsx/bds/player";
import {ItemStack} from "bdsx/bds/inventory";
import {isWand} from "@bdsx/claim-pilot/src/utils";
import {triggerWandUse} from "@bdsx/claim-pilot/src/claims/claimBuilder";

export namespace WandUseEvent {
    export const ID = 'WandUseEvent';
    export const CANCELABLE = true;
    export type CALLBACK = (pos: BlockPos, player: ServerPlayer, item: ItemStack) => boolean;

    export function register(callback: CALLBACK) {
        registerEvent(WandUseEvent.ID, callback);
    }

    export function handleFireCallbacks(callbacks: CALLBACK[], data: any) {
        let shouldExecute = true;
        for (const callback of callbacks) {
            const res = callback(data.pos, data.player, data.item);
            if (res) {
                shouldExecute = false;
            }
        }

        return shouldExecute;
    }
}

registerEventType(WandUseEvent);

const wandUseMap: Map<string, number> = new Map();

events.itemUseOnBlock.on((ev) => {
    // Checking if a wand was used
    if (!isWand(ev.itemStack)) {
        return;
    }

    // Checking a player is what used the item
    const player = ev.actor;
    if (!player.isPlayer()) {
        return;
    }

    const xuid = player.getXuid();

    const lastUse = wandUseMap.get(xuid);
    const now = Date.now();
    if (lastUse !== undefined && (now - lastUse) <= CONFIG.wandFireRate) {
        // Player is still in the cool down for the item
        return CANCEL;
    }

    wandUseMap.set(xuid, now);

    const bPos = BlockPos.create(ev);

    const res = fireEvent(WandUseEvent.ID, {
        pos: bPos,
        player: player,
        item: ev.itemStack,
    })

    if (res) {
        triggerWandUse(bPos, player);
    }

    return CANCEL;
});