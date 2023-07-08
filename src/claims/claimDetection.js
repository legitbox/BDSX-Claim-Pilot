"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentClaim = void 0;
const event_1 = require("bdsx/event");
const configManager_1 = require("../configManager");
const launcher_1 = require("bdsx/launcher");
const decay_1 = require("bdsx/decay");
var isDecayed = decay_1.decay.isDecayed;
const claim_1 = require("./claim");
const eventStorage_1 = require("../events/eventStorage");
const enteredLeftClaimEvent_1 = require("../events/enteredLeftClaimEvent");
const currentClaims = new Map(); // Key: xuid, Value: ClaimID
let claimCheckInterval = undefined;
event_1.events.serverOpen.on(() => {
    claimCheckInterval = setInterval(() => {
        if (isDecayed(launcher_1.bedrockServer.level)) {
            clearInterval(claimCheckInterval);
            return;
        }
        const players = launcher_1.bedrockServer.level.getPlayers();
        for (const player of players) {
            const xuid = player.getXuid();
            const pos = player.getPosition();
            const claim = (0, claim_1.getClaimAtPos)(pos, player.getDimensionId());
            const currentClaim = currentClaims.get(xuid);
            let shouldFire = false;
            if (claim === undefined && currentClaim !== undefined) {
                currentClaims.delete(xuid);
                shouldFire = true;
            }
            else if (claim !== undefined && currentClaim !== claim.id) {
                const group = claim.tryGetGroup();
                currentClaims.set(xuid, claim.id);
                if (group === undefined || (currentClaim === undefined || !group.claimIds.includes(currentClaim))) {
                    shouldFire = true;
                }
            }
            if (shouldFire) {
                (0, eventStorage_1.fireEvent)(enteredLeftClaimEvent_1.EnteredLeftClaimEvent.ID, { player, claim });
            }
        }
    }, configManager_1.CONFIG.claimUpdateRate);
});
enteredLeftClaimEvent_1.EnteredLeftClaimEvent.register(onClaimInteraction);
function onClaimInteraction(player, claim) {
    if (claim === undefined) {
        player.sendMessage('§eEntered §aWild§e!');
        return;
    }
    player.sendMessage(`§eEntered §d${claim.getName()}§e!`);
}
function getCurrentClaim(xuid) {
    const currentId = currentClaims.get(xuid);
    if (currentId === undefined) {
        return;
    }
    return (0, claim_1.getClaimFromId)(currentId);
}
exports.getCurrentClaim = getCurrentClaim;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1EZXRlY3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFpbURldGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxzQ0FBa0M7QUFDbEMsb0RBQXdDO0FBQ3hDLDRDQUE0QztBQUM1QyxzQ0FBaUM7QUFDakMsSUFBTyxTQUFTLEdBQUcsYUFBSyxDQUFDLFNBQVMsQ0FBQztBQUNuQyxtQ0FBNkQ7QUFDN0QseURBQWlEO0FBQ2pELDJFQUFzRTtBQUd0RSxNQUFNLGFBQWEsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLDRCQUE0QjtBQUVsRixJQUFJLGtCQUFrQixHQUF3QixTQUFTLENBQUM7QUFFeEQsY0FBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFO0lBQ3RCLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUU7UUFDbEMsSUFBSSxTQUFTLENBQUMsd0JBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNoQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUNsQyxPQUFPO1NBQ1Y7UUFFRCxNQUFNLE9BQU8sR0FBRyx3QkFBYSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNqRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtZQUMxQixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDOUIsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sS0FBSyxHQUFHLElBQUEscUJBQWEsRUFBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7WUFDMUQsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUU3QyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7WUFFdkIsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUU7Z0JBQ25ELGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzNCLFVBQVUsR0FBRyxJQUFJLENBQUM7YUFDckI7aUJBQU0sSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLFlBQVksS0FBSyxLQUFLLENBQUMsRUFBRSxFQUFFO2dCQUN6RCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBRWxDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFFbEMsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUU7b0JBQy9GLFVBQVUsR0FBRyxJQUFJLENBQUM7aUJBQ3JCO2FBQ0o7WUFFRCxJQUFJLFVBQVUsRUFBRTtnQkFDWixJQUFBLHdCQUFTLEVBQUMsNkNBQXFCLENBQUMsRUFBRSxFQUFFLEVBQUMsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7YUFDeEQ7U0FDSjtJQUNMLENBQUMsRUFBRSxzQkFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0FBQzlCLENBQUMsQ0FBQyxDQUFBO0FBRUYsNkNBQXFCLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFFbkQsU0FBUyxrQkFBa0IsQ0FBQyxNQUFvQixFQUFFLEtBQXdCO0lBQ3RFLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTtRQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDMUMsT0FBTztLQUNWO0lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDNUQsQ0FBQztBQUVELFNBQWdCLGVBQWUsQ0FBQyxJQUFZO0lBQ3hDLE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUMsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFO1FBQ3pCLE9BQU87S0FDVjtJQUVELE9BQU8sSUFBQSxzQkFBYyxFQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3JDLENBQUM7QUFQRCwwQ0FPQyJ9