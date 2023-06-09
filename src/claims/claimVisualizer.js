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
            const claims = (0, claim_1.getOwnedClaims)(xuid);
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
event_1.events.packetSend(packetids_1.MinecraftPacketIds.SpawnParticleEffect).on((pkt, ni) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1WaXN1YWxpemVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhaW1WaXN1YWxpemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsaUVBQTREO0FBQzVELG9DQUF1RjtBQUN2RixzQ0FBa0M7QUFDbEMsb0RBQXdDO0FBQ3hDLG1DQUF1QztBQUN2Qyw0Q0FBNEM7QUFDNUMsZ0RBQXVDO0FBQ3ZDLGtEQUFzRDtBQUN0RCx3Q0FBbUM7QUFDbkMsc0NBQWlDO0FBQ2pDLElBQU8sU0FBUyxHQUFHLGFBQUssQ0FBQyxTQUFTLENBQUM7QUFHbkMsSUFBSSxjQUFjLEdBQWEsRUFBRSxDQUFDO0FBRWxDLG1DQUFnQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUV6QyxTQUFTLGFBQWEsQ0FBQyxNQUFvQjtJQUN2QyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDekMsSUFBSSxDQUFDLElBQUEsY0FBTSxFQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQ25CLE9BQU87S0FDVjtJQUVELE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBRWpELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzFFLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQVk7SUFDbEMsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUUxQyxJQUFJLEdBQUcsRUFBRTtRQUNMLGNBQWMsR0FBRyxJQUFBLDJCQUFtQixFQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztLQUM5RDtTQUFNO1FBQ0gsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUM3QjtJQUVELE9BQU8sR0FBRyxDQUFDO0FBQ2Ys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