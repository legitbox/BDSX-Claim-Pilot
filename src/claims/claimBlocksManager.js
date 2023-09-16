"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFromMaxBlocks = exports.addToMaxBlocks = exports.setMaxBlocks = exports.setPlayerBlockInfo = exports.addUsedBlocksToPlayer = exports.freeBlocksForPlayer = exports.getPlayerBlockInfo = exports.getPlayerMaxBlocks = exports.getPlayerUsedBlocks = exports.getPlayerFreeBlocks = exports.getAllPlayerBlockPairs = exports.BlockInfo = void 0;
const configManager_1 = require("../configManager");
const storageManager_1 = require("../Storage/storageManager");
const claim_1 = require("./claim");
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
    const ownedClaims = (0, claim_1.getOwnedClaims)(playerXuid, true);
    if (ownedClaims.length === 0) {
        blocks.usedBlocks = 0;
        playerBlockMap.set(playerXuid, blocks);
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
function setMaxBlocks(playerXuid, amount, shouldSave = true) {
    let info = playerBlockMap.get(playerXuid);
    if (info === undefined) {
        info = setPlayerToDefaultBlockInfo(playerXuid);
    }
    info.addedMaxBlocks = amount;
    if (shouldSave) {
        (0, storageManager_1.saveData)();
    }
    return getPlayerMaxBlocks(playerXuid);
}
exports.setMaxBlocks = setMaxBlocks;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1CbG9ja3NNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhaW1CbG9ja3NNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9EQUF3QztBQUN4Qyw4REFBbUQ7QUFDbkQsbUNBQXVDO0FBRXZDLE1BQWEsU0FBUztJQUlsQixZQUFZLGNBQXNCLEVBQUUsVUFBa0I7UUFDbEQsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFDckMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7SUFDakMsQ0FBQztJQUVELE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBUztRQUNyQixPQUFPLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQy9ELENBQUM7Q0FDSjtBQVpELDhCQVlDO0FBRUQsTUFBTSxjQUFjLEdBQTJCLElBQUksR0FBRyxFQUFFLENBQUM7QUFFekQsU0FBUywyQkFBMkIsQ0FBQyxVQUFrQjtJQUNuRCxNQUFNLGdCQUFnQixHQUFHLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM3QyxjQUFjLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ2hELE9BQU8sZ0JBQWdCLENBQUM7QUFDNUIsQ0FBQztBQUVELFNBQWdCLHNCQUFzQjtJQUNsQyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7QUFDaEQsQ0FBQztBQUZELHdEQUVDO0FBRUQsU0FBZ0IsbUJBQW1CLENBQUMsVUFBa0I7SUFDbEQsSUFBSSxNQUFNLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM1QyxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7UUFDdEIsTUFBTSxHQUFHLDJCQUEyQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0tBQ3BE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