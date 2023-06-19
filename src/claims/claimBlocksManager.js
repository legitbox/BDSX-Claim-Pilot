"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFromMaxBlocks = exports.addToMaxBlocks = exports.setPlayerBlockInfo = exports.addUsedBlocksToPlayer = exports.freeBlocksForPlayer = exports.getPlayerBlockInfo = exports.getPlayerMaxBlocks = exports.getPlayerUsedBlocks = exports.getPlayerFreeBlocks = exports.getAllPlayerBlockPairs = exports.BlockInfo = void 0;
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
function getPlayerBlockInfo(xuid) {
    let res = playerBlockMap.get(xuid);
    if (res === undefined) {
        res = new BlockInfo(0, 0);
        playerBlockMap.set(xuid, res);
    }
    return res;
}
exports.getPlayerBlockInfo = getPlayerBlockInfo;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1CbG9ja3NNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhaW1CbG9ja3NNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9EQUF3QztBQUN4Qyw4REFBbUQ7QUFFbkQsTUFBYSxTQUFTO0lBSWxCLFlBQVksY0FBc0IsRUFBRSxVQUFrQjtRQUNsRCxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUNyQyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztJQUNqQyxDQUFDO0lBRUQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFTO1FBQ3JCLE9BQU8sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDL0QsQ0FBQztDQUNKO0FBWkQsOEJBWUM7QUFFRCxNQUFNLGNBQWMsR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUV6RCxTQUFTLDJCQUEyQixDQUFDLFVBQWtCO0lBQ25ELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdDLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLENBQUE7SUFDaEQsT0FBTyxnQkFBZ0IsQ0FBQztBQUM1QixDQUFDO0FBRUQsU0FBZ0Isc0JBQXNCO0lBQ2xDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUNoRCxDQUFDO0FBRkQsd0RBRUM7QUFFRCxTQUFnQixtQkFBbUIsQ0FBQyxVQUFrQjtJQUNsRCxJQUFJLE1BQU0sR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVDLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtRQUN0QixNQUFNLEdBQUcsMkJBQTJCLENBQUMsVUFBVSxDQUFDLENBQUM7S0FDcEQ7SUFFRCxPQUFPLGtC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