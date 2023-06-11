import Timeout = NodeJS.Timeout;
import {decay} from "bdsx/decay";
import isDecayed = decay.isDecayed;
import {events} from "bdsx/event";
import {CONFIG} from "../configManager";
import {bedrockServer} from "bdsx/launcher";
import {saveData} from "../Storage/storageManager";
import {createFormattedTimeString, getXuidFromLoginPkt} from "../utils";
import {MinecraftPacketIds} from "bdsx/bds/packetids";
import {CANCEL} from "bdsx/common";
import {CustomForm, FormLabel} from "bdsx/bds/form";
import {fireEvent} from "../events/eventStorage";
import {PlaytimeUpdateEvent} from "../events/playtimeUpdateEvent";
import {getTimeUntilNextPayout} from "../claims/claimsBlockPayout";
import {getPlayerMaxBlocks} from "../claims/claimBlocksManager";

const playerTimeInfoMap: Map<string, PlayerTimeInfo> = new Map();
const playerJoinTimeMap: Map<string, number> = new Map();
const playerNameMap: Map<string, string> = new Map();

export class PlayerTimeInfo {
    lastCheckTime: number | undefined;
    leaveTime: number | undefined;
    totalTime: number;
    paidTime: number;
    isOnline: boolean;

    constructor(totalTime: number, paidTime: number, isOnline: boolean) {
        this.totalTime = totalTime;
        this.isOnline = isOnline;
        this.paidTime = paidTime;
    }
}
let playtimeInterval: Timeout | undefined = undefined;

export type PlaytimeRewardCallback = (playerXuid: string, rewardCount: number) => void | boolean;

export class PlaytimeRewardOptions {
    rewardName: string;
    rewardInterval: number;
    rewardCallback: PlaytimeRewardCallback;

    constructor(name: string, interval: number, callback: PlaytimeRewardCallback) {
        this.rewardName = name;
        this.rewardInterval = interval;
        this.rewardCallback = callback;
    }
}

export class PlaytimeRewardInfo {
    rewardName: string;
    paidTime: number;

    constructor(rewardName: string, paidTime: number) {
        this.rewardName = rewardName;
        this.paidTime = paidTime;
    }

    static fromData(data: any) {
        return new PlaytimeRewardInfo(data.rewardName, data.paidTime);
    }
}

const playtimeRewardOptions: Map<string, PlaytimeRewardOptions> = new Map();
const playerPlaytimeRewards: Map<string, Map<string, PlaytimeRewardInfo>> = new Map();

export function getPlaytimeRewardOptions(rewardName: string) {
    return playtimeRewardOptions.get(rewardName);
}

export function registerPlaytimeRewardType(rewardName: string, interval: number, callback: PlaytimeRewardCallback) {
    return playtimeRewardOptions.set(
        rewardName, new PlaytimeRewardOptions(rewardName, interval, callback),
    );
}

export function addPlaytimeRewardInfo(xuid: string, rewardInfo: PlaytimeRewardInfo) {
    let rewardInfoMap = playerPlaytimeRewards.get(xuid);
    if (rewardInfoMap === undefined) {
        rewardInfoMap = new Map();
        playerPlaytimeRewards.set(xuid, rewardInfoMap);
    }

    rewardInfoMap.set(rewardInfo.rewardName, rewardInfo);
}

export function getPlaytimeRewardInfo(xuid: string) {
    return playerPlaytimeRewards.get(xuid);
}

function getAndUpdateCurrentPlaytime(xuid: string, isOnline: boolean, shouldSave: boolean = true) {
    const info = playerTimeInfoMap.get(xuid);
    if (info === undefined) {
        playerTimeInfoMap.set(xuid, new PlayerTimeInfo(0, 0, isOnline));

        return 0;
    }

    info.totalTime = getTotalTime(xuid);

    if (shouldSave) {
        saveData();
    }

    if (info.isOnline) {
        info.lastCheckTime = Date.now();
    } else {
        info.lastCheckTime = undefined;
    }

    fireEvent(PlaytimeUpdateEvent.ID, {xuid: xuid, playtimeInfo: info});

    return info.totalTime;
}

export function getTotalTime(xuid: string) {
    const timeInfo = playerTimeInfoMap.get(xuid);
    if (timeInfo === undefined) {
        return 0;
    }

    const timeSinceLastCheck = getTimeSinceLastCheck(xuid);

    return timeInfo.totalTime + timeSinceLastCheck;
}

export function getTimeSinceLastCheck(xuid: string) {
    const timeInfo = playerTimeInfoMap.get(xuid);
    if (timeInfo === undefined || timeInfo.lastCheckTime === undefined) {
        return 0;
    }

    let endTime: number = timeInfo.leaveTime === undefined ? Date.now() : timeInfo.leaveTime;

    return endTime - timeInfo.lastCheckTime;
}

export function getSessionTime(xuid: string) {
    const joinTime = playerJoinTimeMap.get(xuid);
    if (joinTime === undefined) {
        return 0;
    }

    return Date.now() - joinTime;
}

export function getTimeRewardedFor(xuid: string) {
    const info = playerTimeInfoMap.get(xuid);
    if (info === undefined) {
        return 0;
    }

    if (isNaN(info.paidTime)) {
        info.paidTime = 0;
    }

    return info.paidTime;
}

export function setTimeRewardedFor(xuid: string, amount: number, shouldSave: boolean = true) {
    let info = playerTimeInfoMap.get(xuid);
    if (info === undefined) {
        info = new PlayerTimeInfo(0, 0, false);
        playerTimeInfoMap.set(xuid, info);
    }

    info.paidTime = amount;

    if (shouldSave) {
        saveData();
    }
}

export function setPlayerPlaytime(xuid: string, paidTime: number, isOnline: boolean, amount: number) {
    playerTimeInfoMap.set(xuid, new PlayerTimeInfo(amount, paidTime, isOnline));
}

events.serverOpen.on(() => {
    playtimeInterval = setInterval(() => {
        if (isDecayed(bedrockServer.level)) {
            clearInterval(playtimeInterval);
            return;
        }

        for (const [xuid, timeInfo] of playerTimeInfoMap.entries()) {
            if (timeInfo.lastCheckTime === undefined) {
                // Player isn't online and has already had final time submitted to total
                continue;
            }

            getAndUpdateCurrentPlaytime(xuid, false);

            saveData();
        }
    }, CONFIG.playtimeUpdateInterval);
})

const niToXuidMap: Map<string, string> = new Map();

events.packetRaw(MinecraftPacketIds.Login).on((pkt, _s, ni) => {
    const playerInfo = getXuidFromLoginPkt(pkt);
    if (playerInfo === undefined) {
        // XUID not provided in packet, server is either offline mode or some hacking is afoot, canceling just in case.
        return CANCEL;
    }

    const [xuid, name] = playerInfo;

    let timeInfo = playerTimeInfoMap.get(xuid);
    if (timeInfo === undefined) {
        timeInfo = new PlayerTimeInfo(0, 0, true);
        playerTimeInfoMap.set(xuid, timeInfo);
    } else {
        timeInfo.isOnline = true;
    }

    const now = Date.now();
    timeInfo.lastCheckTime = now;
    playerJoinTimeMap.set(xuid, now);

    playerNameMap.set(xuid, name);

    niToXuidMap.set(ni.address.rakNetGuid.g, xuid);

    // Player save data is based on the basis they have block info, so creating block info
    getPlayerMaxBlocks(xuid);
})

events.networkDisconnected.on((ni) => {
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
})

export function sendPlaytimeFormForPlayer(formViewerXuid: string, targetXuid: string) {
    // Grabbing player
    const player = bedrockServer.level.getPlayerByXuid(formViewerXuid);
    if (player === null) {
        console.log('player is null?');
        return false;
    }

    const currentTime = getTotalTime(targetXuid);
    const sessionTime = getSessionTime(targetXuid);
    const timeUntilNextPayout = getTimeUntilNextPayout(targetXuid);

    const name = playerNameMap.get(targetXuid);
    if (name === undefined) {
        console.log('Name not logged');
        return false;
    }

    // Building playtime string
    let contentString = `§dInfo about §b${name}§d's playtime!\n`;

    let totalTimeStr = createFormattedTimeString(currentTime);
    let sessionTimeStr = createFormattedTimeString(sessionTime);
    let timeUntilNextPayoutStr = createFormattedTimeString(timeUntilNextPayout);

    contentString += `§aTotal Play Time: ${totalTimeStr}§a!\n`;
    contentString += `§aCurrent Session Play Time: ${sessionTimeStr}§a!\n`;
    contentString += '\n';
    if (CONFIG.playtimeBlockRewardEnabled) {
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

        contentString += `§aTime until next ${rewardName} payout: ${createFormattedTimeString(timeRemaining)}§a!\n\n`;
    }

    const form = new CustomForm('Playtime Info', [
        new FormLabel(contentString),
    ]);
    form.sendTo(player.getNetworkIdentifier());
}

export function getTimeInfo(xuid: string) {
    let res = playerTimeInfoMap.get(xuid);
    if (res === undefined) {
        res = new PlayerTimeInfo(0, 0, false);
        playerTimeInfoMap.set(xuid, res);
    }
    return res;
}

export function onPlaytimeUpdated(xuid: string, timeInfo: PlayerTimeInfo) {
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

PlaytimeUpdateEvent.register(onPlaytimeUpdated);
