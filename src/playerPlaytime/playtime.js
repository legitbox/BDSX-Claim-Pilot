"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPlaytimeUpdated = exports.getTimeInfo = exports.sendPlaytimeFormForPlayer = exports.setPlayerPlaytime = exports.setTimeRewardedFor = exports.getTimeRewardedFor = exports.getSessionTime = exports.getTimeSinceLastCheck = exports.getTotalTime = exports.getPlaytimeRewardInfo = exports.addPlaytimeRewardInfo = exports.registerPlaytimeRewardType = exports.getPlaytimeRewardOptions = exports.PlaytimeRewardInfo = exports.PlaytimeRewardOptions = exports.PlayerTimeInfo = void 0;
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
const claimBlocksManager_1 = require("../claims/claimBlocksManager");
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
class PlaytimeRewardOptions {
    constructor(name, interval, callback) {
        this.rewardName = name;
        this.rewardInterval = interval;
        this.rewardCallback = callback;
    }
}
exports.PlaytimeRewardOptions = PlaytimeRewardOptions;
class PlaytimeRewardInfo {
    constructor(rewardName, paidTime) {
        this.rewardName = rewardName;
        this.paidTime = paidTime;
    }
    static fromData(data) {
        return new PlaytimeRewardInfo(data.rewardName, data.paidTime);
    }
}
exports.PlaytimeRewardInfo = PlaytimeRewardInfo;
const playtimeRewardOptions = new Map();
const playerPlaytimeRewards = new Map();
function getPlaytimeRewardOptions(rewardName) {
    return playtimeRewardOptions.get(rewardName);
}
exports.getPlaytimeRewardOptions = getPlaytimeRewardOptions;
function registerPlaytimeRewardType(rewardName, interval, callback) {
    return playtimeRewardOptions.set(rewardName, new PlaytimeRewardOptions(rewardName, interval, callback));
}
exports.registerPlaytimeRewardType = registerPlaytimeRewardType;
function addPlaytimeRewardInfo(xuid, rewardInfo) {
    let rewardInfoMap = playerPlaytimeRewards.get(xuid);
    if (rewardInfoMap === undefined) {
        rewardInfoMap = new Map();
        playerPlaytimeRewards.set(xuid, rewardInfoMap);
    }
    rewardInfoMap.set(rewardInfo.rewardName, rewardInfo);
}
exports.addPlaytimeRewardInfo = addPlaytimeRewardInfo;
function getPlaytimeRewardInfo(xuid) {
    return playerPlaytimeRewards.get(xuid);
}
exports.getPlaytimeRewardInfo = getPlaytimeRewardInfo;
function getAndUpdateCurrentPlaytime(xuid, isOnline, shouldSave = true) {
    const playtimeInfo = playerTimeInfoMap.get(xuid);
    if (playtimeInfo === undefined) {
        playerTimeInfoMap.set(xuid, new PlayerTimeInfo(0, 0, isOnline));
        return 0;
    }
    playtimeInfo.totalTime = getTotalTime(xuid);
    if (shouldSave) {
        (0, storageManager_1.saveData)();
    }
    if (playtimeInfo.isOnline) {
        playtimeInfo.lastCheckTime = Date.now();
    }
    else {
        playtimeInfo.lastCheckTime = undefined;
    }
    const eventRes = (0, eventStorage_1.fireEvent)(playtimeUpdateEvent_1.PlaytimeUpdateEvent.ID, { xuid, playtimeInfo });
    if (typeof eventRes !== "boolean") {
        eventRes.then();
    }
    return playtimeInfo.totalTime;
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
    if (isNaN(info.paidTime)) {
        info.paidTime = 0;
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
    // Player save data is based on the basis they have block info, so creating block info
    (0, claimBlocksManager_1.getPlayerMaxBlocks)(xuid);
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
        return false;
    }
    const currentTime = getTotalTime(targetXuid);
    const sessionTime = getSessionTime(targetXuid);
    const timeUntilNextPayout = (0, claimsBlockPayout_1.getTimeUntilNextPayout)(targetXuid);
    const name = playerNameMap.get(targetXuid);
    if (name === undefined) {
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
    if (configManager_1.CONFIG.playtimeBlockRewardEnabled) {
        contentString += `§aTime until next block payout: ${timeUntilNextPayoutStr}§a!\n`;
    }
    const rewardOptions = playtimeRewardOptions.entries();
    let playerRewardInfo = playerPlaytimeRewards.get(targetXuid);
    if (playerRewardInfo === undefined) {
        playerRewardInfo = new Map();
        playerPlaytimeRewards.set(targetXuid, playerRewardInfo);
    }
    for (const [rewardName, options] of rewardOptions) {
        let rewardTimeInfo = playerRewardInfo.get(rewardName);
        if (rewardTimeInfo === undefined) {
            rewardTimeInfo = new PlaytimeRewardInfo(rewardName, 0);
            playerRewardInfo.set(rewardName, rewardTimeInfo);
        }
        const unrewardedTime = currentTime - rewardTimeInfo.paidTime;
        const timeRemaining = Math.max(options.rewardInterval - unrewardedTime, 0);
        contentString += `§aTime until next ${rewardName} payout: ${(0, utils_1.createFormattedTimeString)(timeRemaining)}§a!\n\n`;
    }
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
function onPlaytimeUpdated(xuid, timeInfo) {
    let extraRewardCounters = playerPlaytimeRewards.get(xuid);
    if (extraRewardCounters === undefined) {
        extraRewardCounters = new Map();
        playerPlaytimeRewards.set(xuid, extraRewardCounters);
    }
    for (const [rewardName, options] of playtimeRewardOptions.entries()) {
        let rewardTimeInfo = extraRewardCounters.get(rewardName);
        if (rewardTimeInfo === undefined) {
            rewardTimeInfo = new PlaytimeRewardInfo(rewardName, 0);
            extraRewardCounters.set(rewardName, rewardTimeInfo);
        }
        const unpaidTime = timeInfo.totalTime - rewardTimeInfo.paidTime;
        const rewardCount = Math.floor(unpaidTime / options.rewardInterval);
        if (rewardCount !== 0) {
            let rewarded = options.rewardCallback(xuid, rewardCount);
            if (rewarded === undefined) {
                rewarded = true;
            }
            if (rewarded) {
                rewardTimeInfo.paidTime += options.rewardInterval * rewardCount;
            }
        }
    }
}
exports.onPlaytimeUpdated = onPlaytimeUpdated;
playtimeUpdateEvent_1.PlaytimeUpdateEvent.register(onPlaytimeUpdated);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxheXRpbWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwbGF5dGltZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxzQ0FBaUM7QUFDakMsSUFBTyxTQUFTLEdBQUcsYUFBSyxDQUFDLFNBQVMsQ0FBQztBQUNuQyxzQ0FBa0M7QUFDbEMsb0RBQXdDO0FBQ3hDLDRDQUE0QztBQUM1Qyw4REFBbUQ7QUFDbkQsb0NBQXdFO0FBQ3hFLGtEQUFzRDtBQUN0RCx3Q0FBbUM7QUFDbkMsd0NBQW9EO0FBQ3BELHlEQUFpRDtBQUNqRCx1RUFBa0U7QUFDbEUsbUVBQW1FO0FBQ25FLHFFQUFnRTtBQUVoRSxNQUFNLGlCQUFpQixHQUFnQyxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ2pFLE1BQU0saUJBQWlCLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7QUFDekQsTUFBTSxhQUFhLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7QUFFckQsTUFBYSxjQUFjO0lBT3ZCLFlBQVksU0FBaUIsRUFBRSxRQUFnQixFQUFFLFFBQWlCO1FBQzlELElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0lBQzdCLENBQUM7Q0FDSjtBQVpELHdDQVlDO0FBQ0QsSUFBSSxnQkFBZ0IsR0FBd0IsU0FBUyxDQUFDO0FBSXRELE1BQWEscUJBQXFCO0lBSzlCLFlBQVksSUFBWSxFQUFFLFFBQWdCLEVBQUUsUUFBZ0M7UUFDeEUsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdkIsSUFBSSxDQUFDLGNBQWMsR0FBRyxRQUFRLENBQUM7UUFDL0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxRQUFRLENBQUM7SUFDbkMsQ0FBQztDQUNKO0FBVkQsc0RBVUM7QUFFRCxNQUFhLGtCQUFrQjtJQUkzQixZQUFZLFVBQWtCLEVBQUUsUUFBZ0I7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