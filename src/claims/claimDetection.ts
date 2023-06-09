import Timeout = NodeJS.Timeout;
import {events} from "bdsx/event";
import {CONFIG} from "../configManager";
import {bedrockServer} from "bdsx/launcher";
import {decay} from "bdsx/decay";
import isDecayed = decay.isDecayed;
import {Claim, getClaimAtPos, getClaimFromId} from "./claim";
import {fireEvent} from "../events/eventStorage";
import {EnteredLeftClaimEvent} from "../events/enteredLeftClaimEvent";

const currentClaims: Map<string, string> = new Map(); // Key: xuid, Value: ClaimID

let claimCheckInterval: Timeout | undefined = undefined;

events.serverOpen.on(() => {
    claimCheckInterval = setInterval(async () => {
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
                const group = claim.tryGetGroup();

                currentClaims.set(xuid, claim.id);

                if (group === undefined || (currentClaim === undefined || !group.claimIds.includes(currentClaim))) {
                    shouldFire = true;
                }
            }

            if (shouldFire) {
                const eventRes = fireEvent(EnteredLeftClaimEvent.ID, {playerXuid: xuid, claim});
                if (typeof eventRes !== "boolean") {
                    await eventRes;
                }
            }
        }
    }, CONFIG.claimUpdateRate)
})

EnteredLeftClaimEvent.register(onClaimInteraction);

function onClaimInteraction(playerXuid: string, claim: Claim | undefined) {
    if (isDecayed(bedrockServer.level)) {
        return;
    }

    const player = bedrockServer.level.getPlayerByXuid(playerXuid);
    if (player === null) {
        return;
    }

    if (claim === undefined) {
        player.sendMessage('§eEntered §aWild§e!');
        return;
    }

    player.sendMessage(`§eEntered §d${claim.getName()}§e!`);
}

export function getCurrentClaim(xuid: string) {
    const currentId = currentClaims.get(xuid);
    if (currentId === undefined) {
        return;
    }

    return getClaimFromId(currentId);
}
