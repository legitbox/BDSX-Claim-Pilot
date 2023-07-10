"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sneakToggleEvent_1 = require("../events/sneakToggleEvent");
const utils_1 = require("../utils");
const event_1 = require("bdsx/event");
const configManager_1 = require("../configManager");
const claim_1 = require("./claim");
const launcher_1 = require("bdsx/launcher");
const blockpos_1 = require("bdsx/bds/blockpos");
const packetids_1 = require("bdsx/bds/packetids");
const common_1 = require("bdsx/common");
const decay_1 = require("bdsx/decay");
var isDecayed = decay_1.decay.isDecayed;
let activeViewList = [];
sneakToggleEvent_1.SneakToggleEvent.register(onSneakToggle);
function onSneakToggle(playerXuid) {
    if (isDecayed(launcher_1.bedrockServer.level)) {
        return;
    }
    const player = launcher_1.bedrockServer.level.getPlayerByXuid(playerXuid);
    if (player === null) {
        return;
    }
    const heldItem = player.getCarriedItem();
    if (!(0, utils_1.isWand)(heldItem)) {
        return;
    }
    const state = toggleVisualizer(player.getXuid());
    player.sendMessage(!state ? '§aShowing claims!' : '§aHiding claims!');
}
function toggleVisualizer(xuid) {
    const res = activeViewList.includes(xuid);
    if (res) {
        activeViewList = (0, utils_1.deleteItemFromArray)(xuid, activeViewList);
    }
    else {
        activeViewList.push(xuid);
    }
    return res;
}
let visualizerInterval = undefined;
let claimViewer = undefined;
event_1.events.serverOpen.on(() => {
    visualizerInterval = setInterval(() => {
        if (isDecayed(launcher_1.bedrockServer.level)) {
            clearInterval(visualizerInterval);
            return;
        }
        else if (!configManager_1.CONFIG.visualiserEnabled) {
            return;
        }
        const players = (0, utils_1.getPlayersFromXuids)(activeViewList);
        for (const player of players) {
            const xuid = player.getXuid();
            const claims = (0, claim_1.getOwnedOrMemberedClaims)(xuid);
            if (claims.length === 0) {
                continue;
            }
            claimViewer = xuid;
            for (const claim of claims) {
                if (player.getDimensionId() !== claim.dimension) {
                    continue;
                }
                const dimension = launcher_1.bedrockServer.level.getDimension(claim.dimension);
                if (dimension === null) {
                    continue;
                }
                const box = (0, utils_1.generateBox)(claim.cornerOne, claim.cornerEight);
                for (const point of box) {
                    launcher_1.bedrockServer.level.spawnParticleEffect(configManager_1.CONFIG.visualiseParticle, blockpos_1.Vec3.create(point), dimension);
                }
            }
            claimViewer = undefined;
        }
    }, configManager_1.CONFIG.visualizerUpdateRate);
});
event_1.events.packetSend(packetids_1.MinecraftPacketIds.SpawnParticleEffect).on((_p, ni) => {
    if (claimViewer === undefined) {
        return;
    }
    const player = ni.getActor();
    if (player === null) {
        return common_1.CANCEL;
    }
    const xuid = player.getXuid();
    if (claimViewer !== xuid) {
        return common_1.CANCEL;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1WaXN1YWxpemVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhaW1WaXN1YWxpemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsaUVBQTREO0FBQzVELG9DQUF1RjtBQUN2RixzQ0FBa0M7QUFDbEMsb0RBQXdDO0FBQ3hDLG1DQUFpRDtBQUNqRCw0Q0FBNEM7QUFDNUMsZ0RBQXVDO0FBQ3ZDLGtEQUFzRDtBQUN0RCx3Q0FBbUM7QUFDbkMsc0NBQWlDO0FBQ2pDLElBQU8sU0FBUyxHQUFHLGFBQUssQ0FBQyxTQUFTLENBQUM7QUFHbkMsSUFBSSxjQUFjLEdBQWEsRUFBRSxDQUFDO0FBRWxDLG1DQUFnQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUV6QyxTQUFTLGFBQWEsQ0FBQyxVQUFrQjtJQUNyQyxJQUFJLFNBQVMsQ0FBQyx3QkFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ2hDLE9BQU87S0FDVjtJQUVELE1BQU0sTUFBTSxHQUFHLHdCQUFhLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMvRCxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7UUFDakIsT0FBTztLQUNWO0lBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3pDLElBQUksQ0FBQyxJQUFBLGNBQU0sRUFBQyxRQUFRLENBQUMsRUFBRTtRQUNuQixPQUFPO0tBQ1Y7SUFFRCxNQUFNLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUVqRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMxRSxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZO0lBQ2xDLE1BQU0sR0FBRyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMs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