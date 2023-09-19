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
    console.log("Running");
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