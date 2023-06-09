"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeUntilNextPayout = void 0;
const playtime_1 = require("../playerPlaytime/playtime");
const configManager_1 = require("../configManager");
const claimBlocksManager_1 = require("./claimBlocksManager");
const playtimeUpdateEvent_1 = require("../events/playtimeUpdateEvent");
const decay_1 = require("bdsx/decay");
const launcher_1 = require("bdsx/launcher");
const storageManager_1 = require("../Storage/storageManager");
var isDecayed = decay_1.decay.isDecayed;
function getTimeUntilNextPayout(xuid) {
    const info = (0, playtime_1.getTimeInfo)(xuid);
    const rewardedTime = (0, playtime_1.getTimeRewardedFor)(xuid);
    const unrewardedTime = info.totalTime - rewardedTime;
    return Math.max(configManager_1.CONFIG.blockPayoutInterval - unrewardedTime, 0);
}
exports.getTimeUntilNextPayout = getTimeUntilNextPayout;
function onPlaytimeUpdated(xuid, timeInfo) {
    const rewardedTime = (0, playtime_1.getTimeRewardedFor)(xuid);
    const unrewardedTime = timeInfo.totalTime - rewardedTime;
    const numOfPayouts = Math.floor(unrewardedTime / configManager_1.CONFIG.blockPayoutInterval);
    if (numOfPayouts <= 0) {
        return;
    }
    const timeBeingRewardedFor = numOfPayouts * configManager_1.CONFIG.blockPayoutInterval;
    const blockUpdateAmount = configManager_1.CONFIG.blockRewardAmount * numOfPayouts;
    (0, claimBlocksManager_1.addToMaxBlocks)(xuid, blockUpdateAmount);
    (0, playtime_1.setTimeRewardedFor)(xuid, timeBeingRewardedFor + rewardedTime);
    if (timeInfo.isOnline && !isDecayed(launcher_1.bedrockServer.level)) {
        const player = launcher_1.bedrockServer.level.getPlayerByXuid(xuid);
        if (player === null) {
            // Player is offline but hasn't updated yet, this shouldn't be possible
            return;
        }
        player.sendMessage(`§aYou have been rewarded §e${blockUpdateAmount}§a more claim blocks!`);
    }
    (0, storageManager_1.saveData)();
}
playtimeUpdateEvent_1.PlaytimeUpdateEvent.register(onPlaytimeUpdated);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1zQmxvY2tQYXlvdXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFpbXNCbG9ja1BheW91dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx5REFBK0c7QUFDL0csb0RBQXdDO0FBQ3hDLDZEQUFvRDtBQUNwRCx1RUFBa0U7QUFDbEUsc0NBQWlDO0FBQ2pDLDRDQUE0QztBQUM1Qyw4REFBbUQ7QUFDbkQsSUFBTyxTQUFTLEdBQUcsYUFBSyxDQUFDLFNBQVMsQ0FBQztBQUVuQyxTQUFnQixzQkFBc0IsQ0FBQyxJQUFZO0lBQy9DLE1BQU0sSUFBSSxHQUFHLElBQUEsc0JBQVcsRUFBQyxJQUFJLENBQUMsQ0FBQztJQUUvQixNQUFNLFlBQVksR0FBRyxJQUFBLDZCQUFrQixFQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDO0lBQ3JELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxzQkFBTSxDQUFDLG1CQUFtQixHQUFHLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNwRSxDQUFDO0FBTkQsd0RBTUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLElBQVksRUFBRSxRQUF3QjtJQUM3RCxNQUFNLFlBQVksR0FBRyxJQUFBLDZCQUFrQixFQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlDLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDO0lBRXpELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxHQUFHLHNCQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUU3RSxJQUFJLFlBQVksSUFBSSxDQUFDLEVBQUU7UUFDbkIsT0FBTztLQUNWO0lBRUQsTUFBTSxvQkFBb0IsR0FBRyxZQUFZLEdBQUcsc0JBQU0sQ0FBQyxtQkFBbUIsQ0FBQztJQUV2RSxNQUFNLGlCQUFpQixHQUFHLHNCQUFNLENBQUMsaUJBQWlCLEdBQUcsWUFBWSxDQUFDO0lBRWxFLElBQUEsbUNBQWMsRUFBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUV4QyxJQUFBLDZCQUFrQixFQUFDLElBQUksRUFBRSxvQkFBb0IsR0FBRyxZQUFZLENBQUMsQ0FBQztJQUU5RCxJQUFJLFFBQVEsQ0FBQyxRQUFRLElBQUksQ0FBQyxTQUFTLENBQUMsd0JBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUN0RCxNQUFNLE1BQU0sR0FBRyx3QkFBYSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekQsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO1lBQ2pCLHVFQUF1RTtZQUN2RSxPQUFPO1NBQ1Y7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLDhCQUE4QixpQkFBaUIsdUJBQXVCLENBQUMsQ0FBQTtLQUM3RjtJQUVELElBQUEseUJBQVEsR0FBRSxDQUFDO0FBQ2YsQ0FBQztBQUVELHlDQUFtQixDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDIn0=