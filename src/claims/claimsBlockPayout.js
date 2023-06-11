"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBlocksBasedOnNewSettings = exports.updateAllPlayerBlocksBasedOnNewSettings = exports.getTimeUntilNextPayout = void 0;
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
function updateAllPlayerBlocksBasedOnNewSettings(oldRewardAmount, oldRewardTime) {
    for (const [xuid] of (0, claimBlocksManager_1.getAllPlayerBlockPairs)()) {
        updateBlocksBasedOnNewSettings(xuid, oldRewardAmount, oldRewardTime);
    }
}
exports.updateAllPlayerBlocksBasedOnNewSettings = updateAllPlayerBlocksBasedOnNewSettings;
function updateBlocksBasedOnNewSettings(xuid, oldRewardAmount, oldRewardTime) {
    const info = (0, playtime_1.getTimeInfo)(xuid);
    const oldRewardCount = Math.floor(info.paidTime / oldRewardTime);
    const newRewardCount = Math.floor(info.paidTime / configManager_1.CONFIG.blockPayoutInterval);
    if (info.paidTime % configManager_1.CONFIG.blockPayoutInterval !== 0) {
        info.paidTime -= info.paidTime % configManager_1.CONFIG.blockPayoutInterval;
    }
    const oldReward = oldRewardCount * oldRewardAmount;
    const newReward = newRewardCount * configManager_1.CONFIG.blockRewardAmount;
    (0, claimBlocksManager_1.removeFromMaxBlocks)(xuid, oldReward, false);
    (0, claimBlocksManager_1.addToMaxBlocks)(xuid, newReward);
}
exports.updateBlocksBasedOnNewSettings = updateBlocksBasedOnNewSettings;
function onPlaytimeUpdated(xuid, timeInfo) {
    if (!configManager_1.CONFIG.playtimeBlockRewardEnabled) {
        return;
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1zQmxvY2tQYXlvdXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFpbXNCbG9ja1BheW91dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx5REFBK0c7QUFDL0csb0RBQXdDO0FBQ3hDLDZEQUFpRztBQUNqRyx1RUFBa0U7QUFDbEUsc0NBQWlDO0FBQ2pDLDRDQUE0QztBQUM1Qyw4REFBbUQ7QUFDbkQsSUFBTyxTQUFTLEdBQUcsYUFBSyxDQUFDLFNBQVMsQ0FBQztBQUVuQyxTQUFnQixzQkFBc0IsQ0FBQyxJQUFZO0lBQy9DLE1BQU0sSUFBSSxHQUFHLElBQUEsc0JBQVcsRUFBQyxJQUFJLENBQUMsQ0FBQztJQUUvQixNQUFNLFlBQVksR0FBRyxJQUFBLDZCQUFrQixFQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDO0lBQ3JELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxzQkFBTSxDQUFDLG1CQUFtQixHQUFHLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNwRSxDQUFDO0FBTkQsd0RBTUM7QUFFRCxTQUFnQix1Q0FBdUMsQ0FBQyxlQUF1QixFQUFFLGFBQXFCO0lBQ2xHLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUEsMkNBQXNCLEdBQUUsRUFBRTtRQUMzQyw4QkFBOEIsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0tBQ3hFO0FBQ0wsQ0FBQztBQUpELDBGQUlDO0FBRUQsU0FBZ0IsOEJBQThCLENBQUMsSUFBWSxFQUFFLGVBQXVCLEVBQUUsYUFBcUI7SUFDdkcsTUFBTSxJQUFJLEdBQUcsSUFBQSxzQkFBVyxFQUFDLElBQUksQ0FBQyxDQUFDO0lBRS9CLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxhQUFhLENBQUMsQ0FBQztJQUNqRSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsc0JBQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQzlFLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxzQkFBTSxDQUFDLG1CQUFtQixLQUFLLENBQUMsRUFBRTtRQUNsRCxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsc0JBQU0sQ0FBQyxtQkFBbUIsQ0FBQztLQUMvRDtJQUVELE1BQU0sU0FBUyxHQUFHLGNBQWMsR0FBRyxlQUFlLENBQUM7SUFDbkQsTUFBTSxTQUFTLEdBQUcsY0FBYyxHQUFHLHNCQUFNLENBQUMsaUJBQWlCLENBQUM7SUFFNUQsSUFBQSx3Q0FBbUIsRUFBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzVDLElBQUEsbUNBQWMsRUFBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDcEMsQ0FBQztBQWRELHdFQWNDO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxJQUFZLEVBQUUsUUFBd0I7SUFDN0QsSUFBSSxDQUFDLHNCQUFNLENBQUMsMEJBQTBCLEVBQUU7UUFDcEMsT0FBTztLQUNWO0lBRUQsTUFBTSxZQUFZLEdBQUcsSUFBQSw2QkFBa0IsRUFBQyxJQUFJLENBQUMsQ0FBQztJQUM5QyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQztJQUV6RCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsR0FBRyxzQkFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFFN0UsSUFBSSxZQUFZLElBQUksQ0FBQyxFQUFFO1FBQ25CLE9BQU87S0FDVjtJQUVELE1BQU0sb0JBQW9CLEdBQUcsWUFBWSxHQUFHLHNCQUFNLENBQUMsbUJBQW1CLENBQUM7SUFFdkUsTUFBTSxpQkFBaUIsR0FBRyxzQkFBTSxDQUFDLGlCQUFpQixHQUFHLFlBQVksQ0FBQztJQUVsRSxJQUFBLG1DQUFjLEVBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFFeEMsSUFBQSw2QkFBa0IsRUFBQyxJQUFJLEVBQUUsb0JBQW9CLEdBQUcsWUFBWSxDQUFDLENBQUM7SUFFOUQsSUFBSSxRQUFRLENBQUMsUUFBUSxJQUFJLENBQUMsU0FBUyxDQUFDLHdCQUFhLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDdEQsTUFBTSxNQUFNLEdBQUcsd0JBQWEsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pELElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtZQUNqQix1RUFBdUU7WUFDdkUsT0FBTztTQUNWO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsaUJBQWlCLHVCQUF1QixDQUFDLENBQUE7S0FDN0Y7SUFFRCxJQUFBLHlCQUFRLEdBQUUsQ0FBQztBQUNmLENBQUM7QUFFRCx5Q0FBbUIsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyJ9