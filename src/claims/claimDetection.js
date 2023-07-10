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
    claimCheckInterval = setInterval(async () => {
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
                const eventRes = (0, eventStorage_1.fireEvent)(enteredLeftClaimEvent_1.EnteredLeftClaimEvent.ID, { playerXuid: xuid, claim });
                if (typeof eventRes !== "boolean") {
                    await eventRes;
                }
            }
        }
    }, configManager_1.CONFIG.claimUpdateRate);
});
enteredLeftClaimEvent_1.EnteredLeftClaimEvent.register(onClaimInteraction);
function onClaimInteraction(playerXuid, claim) {
    if (isDecayed(launcher_1.bedrockServer.level)) {
        return;
    }
    const player = launcher_1.bedrockServer.level.getPlayerByXuid(playerXuid);
    if (player === null) {
        return;
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1EZXRlY3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFpbURldGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxzQ0FBa0M7QUFDbEMsb0RBQXdDO0FBQ3hDLDRDQUE0QztBQUM1QyxzQ0FBaUM7QUFDakMsSUFBTyxTQUFTLEdBQUcsYUFBSyxDQUFDLFNBQVMsQ0FBQztBQUNuQyxtQ0FBNkQ7QUFDN0QseURBQWlEO0FBQ2pELDJFQUFzRTtBQUV0RSxNQUFNLGFBQWEsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLDRCQUE0QjtBQUVsRixJQUFJLGtCQUFrQixHQUF3QixTQUFTLENBQUM7QUFFeEQsY0FBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFO0lBQ3RCLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUN4QyxJQUFJLFNBQVMsQ0FBQyx3QkFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ2hDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQ2xDLE9BQU87U0FDVjtRQUVELE1BQU0sT0FBTyxHQUFHLHdCQUFhLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2pELEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO1lBQzFCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM5QixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDakMsTUFBTSxLQUFLLEdBQUcsSUFBQSxxQkFBYSxFQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUMxRCxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTdDLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztZQUV2QixJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtnQkFDbkQsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDM0IsVUFBVSxHQUFHLElBQUksQ0FBQzthQUNyQjtpQkFBTSxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksWUFBWSxLQUFLLEtBQUssQ0FBQyxFQUFFLEVBQUU7Z0JBQ3pELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFFbEMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUVsQyxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksQ0FBQyxZQUFZLEtBQUssU0FBUyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRTtvQkFDL0YsVUFBVSxHQUFHLElBQUksQ0FBQztpQkFDckI7YUFDSjtZQUVELElBQUksVUFBVSxFQUFFO2dCQUNaLE1BQU0sUUFBUSxHQUFHLElBQUEsd0JBQVMsRUFBQyw2Q0FBcUIsQ0FBQyxFQUFFLEVBQUUsRUFBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7Z0JBQ2hGLElBQUksT0FBTyxRQUFRLEtBQUssU0FBUyxFQUFFO29CQUMvQixNQUFNLFFBQVEsQ0FBQztpQkFDbEI7YUFDSjtTQUNKO0lBQ0wsQ0FBQyxFQUFFLHNCQUFNLENBQUMsZUFBZSxDQUFDLENBQUE7QUFDOUIsQ0FBQyxDQUFDLENBQUE7QUFFRiw2Q0FBcUIsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUVuRCxTQUFTLGtCQUFrQixDQUFDLFVBQWtCLEVBQUUsS0FBd0I7SUFDcEUsSUFBSSxTQUFTLENBQUMsd0JBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNoQyxPQUFPO0tBQ1Y7SUFFRCxNQUFNLE1BQU0sR0FBRyx3QkFBYSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDL0QsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO1FBQ2pCLE9BQU87S0FDVjtJQUVELElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTtRQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDMUMsT0FBTztLQUNWO0lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDNUQsQ0FBQztBQUVELFNBQWdCLGVBQWUsQ0FBQyxJQUFZO0lBQ3hDLE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUMsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFO1FBQ3pCLE9BQU87S0FDVjtJQUVELE9BQU8sSUFBQSxzQkFBYyxFQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3JDLENBQUM7QUFQRCwwQ0FPQyJ9