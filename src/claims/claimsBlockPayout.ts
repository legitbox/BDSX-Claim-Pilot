import {getTimeInfo, getTimeRewardedFor, PlayerTimeInfo, setTimeRewardedFor} from "@bdsx/claim-pilot/src/playerPlaytime/playtime";
import {CONFIG} from "@bdsx/claim-pilot/src/configManager";
import {addToMaxBlocks} from "@bdsx/claim-pilot/src/claims/claimBlocksManager";
import {PlaytimeUpdateEvent} from "@bdsx/claim-pilot/src/events/playtimeUpdateEvent";
import {decay} from "bdsx/decay";
import {bedrockServer} from "bdsx/launcher";
import {saveData} from "@bdsx/claim-pilot/src/Storage/storageManager";
import isDecayed = decay.isDecayed;

export function getTimeUntilNextPayout(xuid: string) {
    const info = getTimeInfo(xuid);

    const rewardedTime = getTimeRewardedFor(xuid);
    const unrewardedTime = info.totalTime - rewardedTime;
    return Math.max(CONFIG.blockPayoutInterval - unrewardedTime, 0);
}

function onPlaytimeUpdated(xuid: string, timeInfo: PlayerTimeInfo) {
    const rewardedTime = getTimeRewardedFor(xuid);
    const unrewardedTime = timeInfo.totalTime - rewardedTime;

    const numOfPayouts = Math.floor(unrewardedTime / CONFIG.blockPayoutInterval);

    if (numOfPayouts <= 0) {
        return;
    }

    const timeBeingRewardedFor = numOfPayouts * CONFIG.blockPayoutInterval;

    const blockUpdateAmount = CONFIG.blockRewardAmount * numOfPayouts;

    addToMaxBlocks(xuid, blockUpdateAmount);

    setTimeRewardedFor(xuid, timeBeingRewardedFor + rewardedTime);

    if (timeInfo.isOnline && !isDecayed(bedrockServer.level)) {
        const player = bedrockServer.level.getPlayerByXuid(xuid);
        if (player === null) {
            // Player is offline but hasn't updated yet, this shouldn't be possible
            return;
        }

        player.sendMessage(`§aYou have been rewarded §e${blockUpdateAmount}§a more claim blocks!`)
    }

    saveData();
}

PlaytimeUpdateEvent.register(onPlaytimeUpdated);