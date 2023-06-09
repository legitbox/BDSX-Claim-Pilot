"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFromMaxBlocks = exports.addToMaxBlocks = exports.setPlayerBlockInfo = exports.addUsedBlocksToPlayer = exports.freeBlocksForPlayer = exports.getPlayerMaxBlocks = exports.getPlayerUsedBlocks = exports.getPlayerFreeBlocks = exports.getAllPlayerBlockPairs = exports.BlockInfo = void 0;
const configManager_1 = require("../configManager");
const storageManager_1 = require("../Storage/storageManager");
class BlockInfo {
    constructor(addedMaxBlocks, usedBlocks) {
        this.addedMaxBlocks = addedMaxBlocks;
        this.usedBlocks = usedBlocks;
    }
    static fromData(data) {
        return new BlockInfo(data.addedMaxBlocks, data.usedBlocks);
    }
}
exports.BlockInfo = BlockInfo;
const playerBlockMap = new Map();
function setPlayerToDefaultBlockInfo(playerXuid) {
    const defaultBlockInfo = new BlockInfo(0, 0);
    playerBlockMap.set(playerXuid, defaultBlockInfo);
    return defaultBlockInfo;
}
function getAllPlayerBlockPairs() {
    return Array.from(playerBlockMap.entries());
}
exports.getAllPlayerBlockPairs = getAllPlayerBlockPairs;
function getPlayerFreeBlocks(playerXuid) {
    let blocks = playerBlockMap.get(playerXuid);
    if (blocks === undefined) {
        blocks = setPlayerToDefaultBlockInfo(playerXuid);
    }
    return getPlayerMaxBlocks(playerXuid) - blocks.usedBlocks;
}
exports.getPlayerFreeBlocks = getPlayerFreeBlocks;
function getPlayerUsedBlocks(playerXuid) {
    let blocks = playerBlockMap.get(playerXuid);
    if (blocks === undefined) {
        blocks = setPlayerToDefaultBlockInfo(playerXuid);
    }
    return blocks.usedBlocks;
}
exports.getPlayerUsedBlocks = getPlayerUsedBlocks;
function getPlayerMaxBlocks(playerXuid) {
    let blocks = playerBlockMap.get(playerXuid);
    if (blocks === undefined) {
        blocks = setPlayerToDefaultBlockInfo(playerXuid);
    }
    return configManager_1.CONFIG.defaultMaxClaimBlocks + blocks.addedMaxBlocks;
}
exports.getPlayerMaxBlocks = getPlayerMaxBlocks;
function freeBlocksForPlayer(playerXuid, amount, shouldSave = true) {
    const oldUsedBlocks = getPlayerUsedBlocks(playerXuid);
    let newUsedBlocks = oldUsedBlocks - amount;
    let blockInfo = playerBlockMap.get(playerXuid);
    if (blockInfo === undefined) {
        throw 'ERROR: Setting Player To Default Blocks Doesnt Work';
    }
    blockInfo.usedBlocks = newUsedBlocks;
    if (shouldSave) {
        (0, storageManager_1.saveData)();
    }
}
exports.freeBlocksForPlayer = freeBlocksForPlayer;
function addUsedBlocksToPlayer(playerXuid, amount, allowUnsafe = false, shouldSave = true) {
    const currentUsed = getPlayerUsedBlocks(playerXuid);
    const newUsed = currentUsed + amount;
    if (!allowUnsafe) {
        const maxBlocks = getPlayerMaxBlocks(playerXuid);
        if (newUsed > maxBlocks) {
            return false;
        }
    }
    const info = playerBlockMap.get(playerXuid);
    if (info === undefined) {
        throw 'ERROR: Setting Player To Default Blocks Doesnt Work';
    }
    info.usedBlocks = newUsed;
    if (shouldSave) {
        (0, storageManager_1.saveData)();
    }
    return true;
}
exports.addUsedBlocksToPlayer = addUsedBlocksToPlayer;
function setPlayerBlockInfo(playerXuid, info, shouldSave = true) {
    playerBlockMap.set(playerXuid, info);
    if (shouldSave) {
        (0, storageManager_1.saveData)();
    }
}
exports.setPlayerBlockInfo = setPlayerBlockInfo;
function addToMaxBlocks(playerXuid, amount, shouldSave = true) {
    let info = playerBlockMap.get(playerXuid);
    if (info === undefined) {
        info = setPlayerToDefaultBlockInfo(playerXuid);
    }
    info.addedMaxBlocks += amount;
    if (shouldSave) {
        (0, storageManager_1.saveData)();
    }
    return getPlayerMaxBlocks(playerXuid);
}
exports.addToMaxBlocks = addToMaxBlocks;
function removeFromMaxBlocks(playerXuid, amount, shouldSave = true) {
    let info = playerBlockMap.get(playerXuid);
    if (info === undefined) {
        info = setPlayerToDefaultBlockInfo(playerXuid);
    }
    info.addedMaxBlocks = Math.max(info.addedMaxBlocks - amount, 0);
    if (shouldSave) {
        (0, storageManager_1.saveData)();
    }
    return getPlayerMaxBlocks(playerXuid);
}
exports.removeFromMaxBlocks = removeFromMaxBlocks;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1CbG9ja3NNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhaW1CbG9ja3NNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9EQUF3QztBQUN4Qyw4REFBbUQ7QUFFbkQsTUFBYSxTQUFTO0lBSWxCLFlBQVksY0FBc0IsRUFBRSxVQUFrQjtRQUNsRCxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUNyQyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztJQUNqQyxDQUFDO0lBRUQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFTO1FBQ3JCLE9BQU8sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDL0QsQ0FBQztDQUNKO0FBWkQsOEJBWUM7QUFFRCxNQUFNLGNBQWMsR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUV6RCxTQUFTLDJCQUEyQixDQUFDLFVBQWtCO0lBQ25ELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdDLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLENBQUE7SUFDaEQsT0FBTyxnQkFBZ0IsQ0FBQztBQUM1QixDQUFDO0FBRUQsU0FBZ0Isc0JBQXNCO0lBQ2xDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUNoRCxDQUFDO0FBRkQsd0RBRUM7QUFFRCxTQUFnQixtQkFBbUIsQ0FBQyxVQUFrQjtJQUNsRCxJQUFJLE1BQU0sR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVDLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtRQUN0QixNQUFNLEdBQUcsMkJBQTJCLENBQUMsVUFBVSxDQUFDLENBQUM7S0FDcEQ7SUFFRCxPQUFPLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDOUQsQ0FBQztBQVBELGtEQU9DO0FBRUQsU0FBZ0IsbUJBQW1CLENBQUMsVUFBa0I7SUFDbEQsSUFBSSxNQUFNLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM1QyxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7UUFDdEIsTUFBTSxHQUFHLDJCQUEyQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0tBQ3BEO0lBRUQsT0FBTyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQzdCLENBQUM7QUFQRCxrREFPQztBQUVELFNBQWdCLGtCQUFrQixDQUFDLFVBQWtCO0lBQ2pELElBQUksTUFBTSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDNUMsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO1FBQ3RCLE1BQU0sR0FBRywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUNwRDtJQUVELE9BQU8sc0JBQU0sQ0FBQyxxQkFBcUIsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDO0FBQ2hFLENBQUM7QUFQRCxnREFPQztBQUVELFNBQWdCLG1CQUFtQixDQUFDLFVBQWtCLEVBQUUsTUFBYyxFQUFFLGFBQXNCLElBQUk7SUFDOUYsTUFBTSxhQUFhLEdBQUcsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDdEQsSUFBSSxhQUFhLEdBQUcsYUFBYSxHQUFHLE1BQU0sQ0FBQztJQUUzQyxJQUFJLFNBQVMsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQy9DLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRTtRQUN6QixNQUFNLHFEQUFxRCxDQUFDO0tBQy9EO0lBRUQsU0FBUyxDQUFDLFVBQVUsR0FBRyxhQUFhLENBQUM7SUFFckMsSUFBSSxVQUFVLEVBQUU7UUFDWixJQUFBLHlCQUFRLEdBQUUsQ0FBQztLQUNkO0FBQ0wsQ0FBQztBQWRELGtEQWNDO0FBRUQsU0FBZ0IscUJBQXFCLENBQUMsVUFBa0IsRUFBRSxNQUFjLEVBQUUsY0FBdUIsS0FBSyxFQUFFLGFBQXNCLElBQUk7SUFDOUgsTUFBTSxXQUFXLEdBQUcsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDcEQsTUFBTSxPQUFPLEdBQUcsV0FBVyxHQUFHLE1BQU0sQ0FBQztJQUVyQyxJQUFJLENBQUMsV0FBVyxFQUFFO1FBQ2QsTUFBTSxTQUFTLEdBQUcsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDakQsSUFBSSxPQUFPLEdBQUcsU0FBUyxFQUFFO1lBQ3JCLE9BQU8sS0FBSyxDQUFDO1NBQ2hCO0tBQ0o7SUFFRCxNQUFNLElBQUksR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVDLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtRQUNwQixNQUFNLHFEQUFxRCxDQUFDO0tBQy9EO0lBRUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUM7SUFFMUIsSUFBSSxVQUFVLEVBQUU7UUFDWixJQUFBLHlCQUFRLEdBQUUsQ0FBQztLQUNkO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQztBQXZCRCxzREF1QkM7QUFFRCxTQUFnQixrQkFBa0IsQ0FBQyxVQUFrQixFQUFFLElBQWUsRUFBRSxhQUFzQixJQUFJO0lBQzlGLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRXJDLElBQUksVUFBVSxFQUFFO1FBQ1osSUFBQSx5QkFBUSxHQUFFLENBQUM7S0FDZDtBQUNMLENBQUM7QUFORCxnREFNQztBQUVELFNBQWdCLGNBQWMsQ0FBQyxVQUFrQixFQUFFLE1BQWMsRUFBRSxhQUFzQixJQUFJO0lBQ3pGLElBQUksSUFBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDMUMsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO1FBQ3BCLElBQUksR0FBRywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUNsRDtJQUVELElBQUksQ0FBQyxjQUFjLElBQUksTUFBTSxDQUFDO0lBRTlCLElBQUksVUFBVSxFQUFFO1FBQ1osSUFBQSx5QkFBUSxHQUFFLENBQUM7S0FDZDtJQUVELE9BQU8sa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDMUMsQ0FBQztBQWJELHdDQWFDO0FBRUQsU0FBZ0IsbUJBQW1CLENBQUMsVUFBa0IsRUFBRSxNQUFjLEVBQUUsYUFBc0IsSUFBSTtJQUM5RixJQUFJLElBQUksR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzFDLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtRQUNwQixJQUFJLEdBQUcsMkJBQTJCLENBQUMsVUFBVSxDQUFDLENBQUM7S0FDbEQ7SUFFRCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFaEUsSUFBSSxVQUFVLEVBQUU7UUFDWixJQUFBLHlCQUFRLEdBQUUsQ0FBQztLQUNkO0lBRUQsT0FBTyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBYkQsa0RBYUMifQ==