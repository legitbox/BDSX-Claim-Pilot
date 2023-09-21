import {CONFIG} from "../configManager";
import {saveData} from "../Storage/storageManager";

export class BlockInfo {
    addedMaxBlocks: number;
    usedBlocks: number;

    constructor(addedMaxBlocks: number, usedBlocks: number) {
        this.addedMaxBlocks = addedMaxBlocks;
        this.usedBlocks = usedBlocks;
    }

    static fromData(data: any) {
        return new BlockInfo(data.addedMaxBlocks, data.usedBlocks);
    }
}

const playerBlockMap: Map<string, BlockInfo> = new Map();

function setPlayerToDefaultBlockInfo(playerXuid: string) {
    const defaultBlockInfo = new BlockInfo(0, 0);
    playerBlockMap.set(playerXuid, defaultBlockInfo)
    return defaultBlockInfo;
}

export function getAllPlayerBlockPairs() { // Returns [xuid, blockCount]
    return Array.from(playerBlockMap.entries());
}

export function getPlayerFreeBlocks(playerXuid: string) {
    let blocks = playerBlockMap.get(playerXuid);
    if (blocks === undefined) {
        blocks = setPlayerToDefaultBlockInfo(playerXuid);
    }

    return getPlayerMaxBlocks(playerXuid) - blocks.usedBlocks;
}

export function getPlayerUsedBlocks(playerXuid: string) {
    let blocks = playerBlockMap.get(playerXuid);
    if (blocks === undefined) {
        blocks = setPlayerToDefaultBlockInfo(playerXuid);
    }

    return blocks.usedBlocks;
}

export function getPlayerMaxBlocks(playerXuid: string) {
    let blocks = playerBlockMap.get(playerXuid);
    if (blocks === undefined) {
        blocks = setPlayerToDefaultBlockInfo(playerXuid);
    }

    return CONFIG.defaultMaxClaimBlocks + blocks.addedMaxBlocks;
}

export function getPlayerBlockInfo(xuid: string) {
    let res = playerBlockMap.get(xuid);
    if (res === undefined) {
        res = new BlockInfo(0, 0);
        playerBlockMap.set(xuid, res);
    }

    return res;
}

export function freeBlocksForPlayer(playerXuid: string, amount: number, shouldSave: boolean = true) {
    const oldUsedBlocks = getPlayerUsedBlocks(playerXuid);
    let newUsedBlocks = oldUsedBlocks - amount;

    let blockInfo = playerBlockMap.get(playerXuid);
    if (blockInfo === undefined) {
        throw 'ERROR: Setting Player To Default Blocks Doesnt Work';
    }

    blockInfo.usedBlocks = newUsedBlocks;

    if (shouldSave) {
        saveData();
    }
}

export function addUsedBlocksToPlayer(playerXuid: string, amount: number, allowUnsafe: boolean = false, shouldSave: boolean = true) {
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
        saveData();
    }

    return true;
}

export function setPlayerBlockInfo(playerXuid: string, info: BlockInfo, shouldSave: boolean = true) {
    playerBlockMap.set(playerXuid, info);

    if (shouldSave) {
        saveData();
    }
}

export function setUsedBlocks(playerXuid: string, amount: number, shouldSave: boolean = true) {
    let info = playerBlockMap.get(playerXuid);
    if (info === undefined) {
        info = setPlayerToDefaultBlockInfo(playerXuid);
    }

    info.usedBlocks = amount;

    if (shouldSave) {
        saveData();
    }

    return getPlayerUsedBlocks(playerXuid);
}

export function setMaxBlocks(playerXuid: string, amount: number, shouldSave: boolean = true) {
    let info = playerBlockMap.get(playerXuid);
    if (info === undefined) {
        info = setPlayerToDefaultBlockInfo(playerXuid);
    }

    info.addedMaxBlocks = amount;

    if (shouldSave) {
        saveData();
    }

    return getPlayerMaxBlocks(playerXuid);
}

export function addToMaxBlocks(playerXuid: string, amount: number, shouldSave: boolean = true) {
    let info = playerBlockMap.get(playerXuid);
    if (info === undefined) {
        info = setPlayerToDefaultBlockInfo(playerXuid);
    }

    info.addedMaxBlocks += amount;

    if (shouldSave) {
        saveData();
    }

    return getPlayerMaxBlocks(playerXuid);
}

export function removeFromMaxBlocks(playerXuid: string, amount: number, shouldSave: boolean = true) {
    let info = playerBlockMap.get(playerXuid);
    if (info === undefined) {
        info = setPlayerToDefaultBlockInfo(playerXuid);
    }

    info.addedMaxBlocks = Math.max(info.addedMaxBlocks - amount, 0);

    if (shouldSave) {
        saveData();
    }

    return getPlayerMaxBlocks(playerXuid);
}
