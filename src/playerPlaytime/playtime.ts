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
    contentString += `§aTime until next payout: ${timeUntilNextPayoutStr}§a!\n`;

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