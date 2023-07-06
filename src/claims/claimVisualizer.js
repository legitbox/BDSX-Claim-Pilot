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
function onSneakToggle(player) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1WaXN1YWxpemVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhaW1WaXN1YWxpemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsaUVBQTREO0FBQzVELG9DQUF1RjtBQUN2RixzQ0FBa0M7QUFDbEMsb0RBQXdDO0FBQ3hDLG1DQUFpRDtBQUNqRCw0Q0FBNEM7QUFDNUMsZ0RBQXVDO0FBQ3ZDLGtEQUFzRDtBQUN0RCx3Q0FBbUM7QUFDbkMsc0NBQWlDO0FBQ2pDLElBQU8sU0FBUyxHQUFHLGFBQUssQ0FBQyxTQUFTLENBQUM7QUFHbkMsSUFBSSxjQUFjLEdBQWEsRUFBRSxDQUFDO0FBRWxDLG1DQUFnQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUV6QyxTQUFTLGFBQWEsQ0FBQyxNQUFvQjtJQUN2QyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDekMsSUFBSSxDQUFDLElBQUEsY0FBTSxFQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQ25CLE9BQU87S0FDVjtJQUVELE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBRWpELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzFFLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQVk7SUFDbEMsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUUxQyxJQUFJLEdBQUcsRUFBRTtRQUNMLGNBQWMsR0FBRyxJQUFBLDJCQUFtQixFQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztLQUM5RDtTQUFNO1FBQ0gsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUM3QjtJQUVELE9BQU8sR0FBRyxDQUFDO0FBQ2Ys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