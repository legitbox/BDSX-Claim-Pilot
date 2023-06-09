"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeInfo = exports.sendPlaytimeFormForPlayer = exports.setPlayerPlaytime = exports.setTimeRewardedFor = exports.getTimeRewardedFor = exports.getSessionTime = exports.getTimeSinceLastCheck = exports.getTotalTime = exports.PlayerTimeInfo = void 0;
const decay_1 = require("bdsx/decay");
var isDecayed = decay_1.decay.isDecayed;
const event_1 = require("bdsx/event");
const configManager_1 = require("../configManager");
const launcher_1 = require("bdsx/launcher");
const storageManager_1 = require("../Storage/storageManager");
const utils_1 = require("../utils");
const packetids_1 = require("bdsx/bds/packetids");
const common_1 = require("bdsx/common");
const form_1 = require("bdsx/bds/form");
const eventStorage_1 = require("../events/eventStorage");
const playtimeUpdateEvent_1 = require("../events/playtimeUpdateEvent");
const claimsBlockPayout_1 = require("../claims/claimsBlockPayout");
const playerTimeInfoMap = new Map();
const playerJoinTimeMap = new Map();
const playerNameMap = new Map();
class PlayerTimeInfo {
    constructor(totalTime, paidTime, isOnline) {
        this.totalTime = totalTime;
        this.isOnline = isOnline;
        this.paidTime = paidTime;
    }
}
exports.PlayerTimeInfo = PlayerTimeInfo;
let playtimeInterval = undefined;
function getAndUpdateCurrentPlaytime(xuid, isOnline, shouldSave = true) {
    const info = playerTimeInfoMap.get(xuid);
    if (info === undefined) {
        playerTimeInfoMap.set(xuid, new PlayerTimeInfo(0, 0, isOnline));
        return 0;
    }
    info.totalTime = getTotalTime(xuid);
    if (shouldSave) {
        (0, storageManager_1.saveData)();
    }
    if (info.isOnline) {
        info.lastCheckTime = Date.now();
    }
    else {
        info.lastCheckTime = undefined;
    }
    (0, eventStorage_1.fireEvent)(playtimeUpdateEvent_1.PlaytimeUpdateEvent.ID, { xuid: xuid, playtimeInfo: info });
    return info.totalTime;
}
function getTotalTime(xuid) {
    const timeInfo = playerTimeInfoMap.get(xuid);
    if (timeInfo === undefined) {
        return 0;
    }
    const timeSinceLastCheck = getTimeSinceLastCheck(xuid);
    return timeInfo.totalTime + timeSinceLastCheck;
}
exports.getTotalTime = getTotalTime;
function getTimeSinceLastCheck(xuid) {
    const timeInfo = playerTimeInfoMap.get(xuid);
    if (timeInfo === undefined || timeInfo.lastCheckTime === undefined) {
        return 0;
    }
    let endTime = timeInfo.leaveTime === undefined ? Date.now() : timeInfo.leaveTime;
    return endTime - timeInfo.lastCheckTime;
}
exports.getTimeSinceLastCheck = getTimeSinceLastCheck;
function getSessionTime(xuid) {
    const joinTime = playerJoinTimeMap.get(xuid);
    if (joinTime === undefined) {
        return 0;
    }
    return Date.now() - joinTime;
}
exports.getSessionTime = getSessionTime;
function getTimeRewardedFor(xuid) {
    const info = playerTimeInfoMap.get(xuid);
    if (info === undefined) {
        return 0;
    }
    return info.paidTime;
}
exports.getTimeRewardedFor = getTimeRewardedFor;
function setTimeRewardedFor(xuid, amount, shouldSave = true) {
    let info = playerTimeInfoMap.get(xuid);
    if (info === undefined) {
        info = new PlayerTimeInfo(0, 0, false);
        playerTimeInfoMap.set(xuid, info);
    }
    info.paidTime = amount;
    if (shouldSave) {
        (0, storageManager_1.saveData)();
    }
}
exports.setTimeRewardedFor = setTimeRewardedFor;
function setPlayerPlaytime(xuid, paidTime, isOnline, amount) {
    playerTimeInfoMap.set(xuid, new PlayerTimeInfo(amount, paidTime, isOnline));
}
exports.setPlayerPlaytime = setPlayerPlaytime;
event_1.events.serverOpen.on(() => {
    playtimeInterval = setInterval(() => {
        if (isDecayed(launcher_1.bedrockServer.level)) {
            clearInterval(playtimeInterval);
            return;
        }
        for (const [xuid, timeInfo] of playerTimeInfoMap.entries()) {
            if (timeInfo.lastCheckTime === undefined) {
                // Player isn't online and has already had final time submitted to total
                continue;
            }
            getAndUpdateCurrentPlaytime(xuid, false);
            (0, storageManager_1.saveData)();
        }
    }, configManager_1.CONFIG.playtimeUpdateInterval);
});
const niToXuidMap = new Map();
event_1.events.packetRaw(packetids_1.MinecraftPacketIds.Login).on((pkt, _s, ni) => {
    const playerInfo = (0, utils_1.getXuidFromLoginPkt)(pkt);
    if (playerInfo === undefined) {
        // XUID not provided in packet, server is either offline mode or some hacking is afoot, canceling just in case.
        return common_1.CANCEL;
    }
    const [xuid, name] = playerInfo;
    let timeInfo = playerTimeInfoMap.get(xuid);
    if (timeInfo === undefined) {
        timeInfo = new PlayerTimeInfo(0, 0, true);
        playerTimeInfoMap.set(xuid, timeInfo);
    }
    else {
        timeInfo.isOnline = true;
    }
    const now = Date.now();
    timeInfo.lastCheckTime = now;
    playerJoinTimeMap.set(xuid, now);
    playerNameMap.set(xuid, name);
    niToXuidMap.set(ni.address.rakNetGuid.g, xuid);
});
event_1.events.networkDisconnected.on((ni) => {
    const xuid = niToXuidMap.get(ni.address.rakNetGuid.g);
    if (xuid === undefined) {
        // Player never joined before disconnect, this is a known crash method
        return;
    }
    const timeInfo = playerTimeInfoMap.get(xuid);
    if (timeInfo === undefined) {
        // Player never logged in here as well, probably not possible to get here
        return;
    }
    timeInfo.isOnline = false;
    playerJoinTimeMap.delete(xuid);
});
function sendPlaytimeFormForPlayer(formViewerXuid, targetXuid) {
    // Grabbing player
    const player = launcher_1.bedrockServer.level.getPlayerByXuid(formViewerXuid);
    if (player === null) {
        console.log('player is null?');
        return false;
    }
    const currentTime = getTotalTime(targetXuid);
    const sessionTime = getSessionTime(targetXuid);
    const timeUntilNextPayout = (0, claimsBlockPayout_1.getTimeUntilNextPayout)(targetXuid);
    const name = playerNameMap.get(targetXuid);
    if (name === undefined) {
        console.log('Name not logged');
        return false;
    }
    // Building playtime string
    let contentString = `§dInfo about §b${name}§d's playtime!\n`;
    let totalTimeStr = (0, utils_1.createFormattedTimeString)(currentTime);
    let sessionTimeStr = (0, utils_1.createFormattedTimeString)(sessionTime);
    let timeUntilNextPayoutStr = (0, utils_1.createFormattedTimeString)(timeUntilNextPayout);
    contentString += `§aTotal Play Time: ${totalTimeStr}§a!\n`;
    contentString += `§aCurrent Session Play Time: ${sessionTimeStr}§a!\n`;
    contentString += '\n';
    contentString += `§aTime until next payout: ${timeUntilNextPayoutStr}§a!\n`;
    const form = new form_1.CustomForm('Playtime Info', [
        new form_1.FormLabel(contentString),
    ]);
    form.sendTo(player.getNetworkIdentifier());
}
exports.sendPlaytimeFormForPlayer = sendPlaytimeFormForPlayer;
function getTimeInfo(xuid) {
    let res = playerTimeInfoMap.get(xuid);
    if (res === undefined) {
        res = new PlayerTimeInfo(0, 0, false);
        playerTimeInfoMap.set(xuid, res);
    }
    return res;
}
exports.getTimeInfo = getTimeInfo;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxheXRpbWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwbGF5dGltZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxzQ0FBaUM7QUFDakMsSUFBTyxTQUFTLEdBQUcsYUFBSyxDQUFDLFNBQVMsQ0FBQztBQUNuQyxzQ0FBa0M7QUFDbEMsb0RBQXdDO0FBQ3hDLDRDQUE0QztBQUM1Qyw4REFBbUQ7QUFDbkQsb0NBQXdFO0FBQ3hFLGtEQUFzRDtBQUN0RCx3Q0FBbUM7QUFDbkMsd0NBQW9EO0FBQ3BELHlEQUFpRDtBQUNqRCx1RUFBa0U7QUFDbEUsbUVBQW1FO0FBRW5FLE1BQU0saUJBQWlCLEdBQWdDLElBQUksR0FBRyxFQUFFLENBQUM7QUFDakUsTUFBTSxpQkFBaUIsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUN6RCxNQUFNLGFBQWEsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUVyRCxNQUFhLGNBQWM7SUFPdkIsWUFBWSxTQUFpQixFQUFFLFFBQWdCLEVBQUUsUUFBaUI7UUFDOUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDN0IsQ0FBQztDQUNKO0FBWkQsd0NBWUM7QUFFRCxJQUFJLGdCQUFnQixHQUF3QixTQUFTLENBQUM7QUFFdEQsU0FBUywyQkFBMkIsQ0FBQyxJQUFZLEVBQUUsUUFBaUIsRUFBRSxhQUFzQixJQUFJO0lBQzVGLE1BQU0sSUFBSSxHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN6QyxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7UUFDcEIsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFaEUsT0FBTyxD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