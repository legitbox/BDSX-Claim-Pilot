import Timeout = NodeJS.Timeout;
import {events} from "bdsx/event";
import {CONFIG} from "@bdsx/claim-pilot/src/configManager";
import {bedrockServer} from "bdsx/launcher";
import {decay} from "bdsx/decay";
import isDecayed = decay.isDecayed;
import {Claim, getClaimAtPos, getClaimFromId} from "@bdsx/claim-pilot/src/claims/claim";
import {fireEvent} from "@bdsx/claim-pilot/src/events/eventStorage";
import {EnteredLeftClaimEvent} from "@bdsx/claim-pilot/src/events/enteredLeftClaimEvent";
import {ServerPlayer} from "bdsx/bds/player";

const currentClaims: Map<string, string> = new Map(); // Key: xuid, Value: ClaimID

let claimCheckInterval: Timeout | undefined = undefined;

events.serverOpen.on(() => {
    claimCheckInterval = setInterval(() => {
        if (isDecayed(bedrockServer.level)) {
            clearInterval(claimCheckInterval);
            return;
        }

        const players = bedrockServer.level.getPlayers();
        for (const player of players) {
            const xuid = player.getXuid();
            const pos = player.getPosition();
            const claim = getClaimAtPos(pos, player.getDimensionId());
            const currentClaim = currentClaims.get(xuid);

            let shouldFire = false;

            if (claim === undefined && currentClaim !== undefined) {
                currentClaims.delete(xuid);
                shouldFire = true;
            } else if (claim !== undefined && currentClaim !== claim.id) {
                currentClaims.set(xuid, claim.id);
                shouldFire = true;
            }

            if (shouldFire) {
                fireEvent(EnteredLeftClaimEvent.ID, {player, claim});
            }
        }
    }, CONFIG.claimUpdateRate)
})

EnteredLeftClaimEvent.register(onClaimInteraction);

function onClaimInteraction(player: ServerPlayer, claim: Claim | undefined) {
    if (claim === undefined) {
        player.sendMessage('§eEntered §aWild§e!');
        return;
    }

    player.sendMessage(`§eEntered §d${claim.name}§e!`);
}

export function getCurrentClaim(xuid: string) {
    const currentId = currentClaims.get(xuid);
    if (currentId === undefined) {
        return;
    }

    return getClaimFromId(currentId);
}