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
        console.log('Test');
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