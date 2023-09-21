"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoredXuidsFromStorage = exports.getName = exports.setName = exports.updateNativeStorage = exports.generateSaveData = exports.getPlayersWithStorage = exports.saveData = exports.registerOnRegisteredDataLoaded = exports.registerDataToBeSaved = exports.NON_XUID_STORAGE = void 0;
const claimBlocksManager_1 = require("../claims/claimBlocksManager");
const claim_1 = require("../claims/claim");
const fs_1 = require("fs");
const fsutil_1 = require("bdsx/fsutil");
const event_1 = require("bdsx/event");
const playtime_1 = require("../playerPlaytime/playtime");
const dllManager_1 = require("../Native/dllManager");
const dllTypes_1 = require("../Native/dllTypes");
const packetids_1 = require("bdsx/bds/packetids");
const utils_1 = require("../utils");
const common_1 = require("bdsx/common");
const storageUpdater_1 = require("./storageUpdater");
var isFileSync = fsutil_1.fsutil.isFileSync;
const STORAGE_PATH = __dirname + '\\claimsData.json';
const CURRENT_STORAGE_VERSION = 2;
exports.NON_XUID_STORAGE = [
    "version",
    "serverClaims",
    "serverGroups",
];
const playerNameMap = new Map();
const dataToBeSavedCallbacks = []; // <xuid, [key, data]>
const onDataLoadedCallbacks = new Map();
function registerDataToBeSaved(callback) {
    dataToBeSavedCallbacks.push(callback);
}
exports.registerDataToBeSaved = registerDataToBeSaved;
function registerOnRegisteredDataLoaded(key, callback) {
    onDataLoadedCallbacks.set(key, callback);
}
exports.registerOnRegisteredDataLoaded = registerOnRegisteredDataLoaded;
function saveData() {
    const data = generateSaveData();
    (0, fs_1.writeFileSync)(STORAGE_PATH, JSON.stringify(data, null, 4));
    const nativeStorage = dllTypes_1.NativeStorageObject.uglyConstruct(data);
    (0, dllManager_1.updateStorageInNative)(nativeStorage);
}
exports.saveData = saveData;
function getPlayersWithStorage() {
    return playerNameMap.entries();
}
exports.getPlayersWithStorage = getPlayersWithStorage;
function generateSaveData() {
    const playersWithStorage = playerNameMap.entries();
    const storage = {};
    storage.version = CURRENT_STORAGE_VERSION;
    const extraData = [];
    for (const callback of dataToBeSavedCallbacks) {
        extraData.push(callback());
    }
    for (const [xuid, name] of playersWithStorage) {
        storage[xuid] = {};
        const ownedClaims = (0, claim_1.getOwnedClaims)(xuid);
        const memberClaimData = createClaimData(ownedClaims);
        storage[xuid].groups = (0, claim_1.getOwnedGroups)(xuid);
        storage[xuid].claims = memberClaimData;
        storage[xuid].blockInfo = (0, claimBlocksManager_1.getPlayerBlockInfo)(xuid);
        storage[xuid].totalTime = (0, playtime_1.getTotalTime)(xuid);
        storage[xuid].paidTime = (0, playtime_1.getTimeRewardedFor)(xuid);
        storage[xuid].name = name;
        const playtimeRewardMap = (0, playtime_1.getPlaytimeRewardInfo)(xuid);
        const rewardInfos = [];
        if (playtimeRewardMap !== undefined) {
            for (const [, rewardInfo] of playtimeRewardMap.entries()) {
                rewardInfos.push(rewardInfo);
            }
        }
        storage[xuid].extraRewardInfo = rewardInfos;
        if (extraData.length !== 0) {
            storage[xuid].extraData = {};
        }
        for (const map of extraData) {
            const data = map.get(xuid);
            if (data === undefined) {
                continue;
            }
            storage[xuid].extraData[data[0]] = data[1];
        }
    }
    const serverClaims = (0, claim_1.getOwnedClaims)("SERVER");
    storage.serverClaims = createClaimData(serverClaims);
    const serverGroups = (0, claim_1.getOwnedGroups)("SERVER");
    const serverGroupData = [];
    for (const group of serverGroups) {
        const memberPermissions = {};
        const memberXuids = Object.keys(group.members);
        for (const xuid of memberXuids) {
            const permissionMap = group.members[xuid];
            const permRecord = {};
            for (const [perm, value] of permissionMap.entries()) {
                permRecord[perm] = value;
            }
            memberPermissions[xuid] = permRecord;
        }
        serverGroupData.push({
            groupId: group.groupId,
            groupName: group.groupName,
            ownerXuid: group.ownerXuid,
            coOwners: group.coOwners,
            claimIds: group.claimIds,
            members: memberPermissions,
        });
    }
    storage.serverGroups = serverGroupData;
    return storage;
}
exports.generateSaveData = generateSaveData;
function updateNativeStorage() {
    const data = generateSaveData();
    const nativeStorage = dllTypes_1.NativeStorageObject.uglyConstruct(data);
    (0, dllManager_1.updateStorageInNative)(nativeStorage);
}
exports.updateNativeStorage = updateNativeStorage;
function loadData(shouldRegisterReadData = true) {
    if (!isFileSync(STORAGE_PATH)) {
        return;
    }
    const fileData = (0, fs_1.readFileSync)(STORAGE_PATH, 'utf-8');
    let data;
    try {
        data = JSON.parse(fileData);
    }
    catch (_a) {
        (0, fs_1.writeFileSync)(__dirname + `\\claimsData-ERR-${Date.now()}.json`, fileData);
        console.error('ERROR LOADING STORAGE: INVALID JSON'.red);
        data = undefined;
    }
    if (data === undefined) {
        return;
    }
    if (data.version !== CURRENT_STORAGE_VERSION) {
        data = updateStorageFromVersion(data, data.version);
    }
    const xuids = getStoredXuidsFromStorage(data);
    for (const xuid of xuids) {
        const playerData = data[xuid];
        for (const claimData of playerData.claims) {
            const claim = claim_1.Claim.fromData(claimData);
            if (shouldRegisterReadData) {
                (0, claim_1.registerClaim)(claim);
            }
        }
        const blockInfoData = playerData.blockInfo;
        (0, claimBlocksManager_1.setPlayerBlockInfo)(xuid, claimBlocksManager_1.BlockInfo.fromData(blockInfoData), false);
        (0, playtime_1.setPlayerPlaytime)(xuid, playerData.paidTime, false, playerData.totalTime);
        for (const rewardInfoData of playerData.extraRewardInfo) {
            const rewardInfo = playtime_1.PlaytimeRewardInfo.fromData(rewardInfoData);
            (0, playtime_1.addPlaytimeRewardInfo)(xuid, rewardInfo);
        }
        if (Object.keys(playerData).includes('name')) {
            playerNameMap.set(xuid, playerData.name);
        }
        if (Object.keys(playerData).includes('groups') && shouldRegisterReadData) {
            const groupDatas = playerData.groups;
            for (const groupData of groupDatas) {
                const group = claim_1.ClaimGroup.fromData(groupData);
                (0, claim_1.registerClaimGroup)(group);
            }
        }
        if (playerData.extraData !== undefined) {
            const keys = Object.keys(playerData.extraData);
            for (const key of keys) {
                const data = playerData.extraData[key];
                const callback = onDataLoadedCallbacks.get(key);
                if (callback !== undefined) {
                    callback(xuid, data);
                }
            }
        }
    }
    if (data.serverClaims !== undefined && shouldRegisterReadData) {
        for (const claimData of data.serverClaims) {
            const claim = claim_1.Claim.fromData(claimData);
            (0, claim_1.registerServerClaim)(claim);
        }
    }
    if (data.serverGroups !== undefined && shouldRegisterReadData) {
        for (const groupData of data.serverGroups) {
            const group = claim_1.ClaimGroup.fromData(groupData);
            (0, claim_1.registerServerClaimGroup)(group);
        }
    }
    const nativeStorage = dllTypes_1.NativeStorageObject.uglyConstruct(data);
    (0, dllManager_1.updateStorageInNative)(nativeStorage);
}
event_1.events.serverOpen.on(() => {
    loadData();
});
event_1.events.packetRaw(packetids_1.MinecraftPacketIds.Login).on((pkt) => {
    const playerData = (0, utils_1.getXuidFromLoginPkt)(pkt);
    if (playerData === undefined) {
        // Something is wrong with their login packet
        return common_1.CANCEL;
    }
    const [xuid, name] = playerData;
    playerNameMap.set(xuid, name);
});
event_1.events.playerJoin.on((ev) => {
    const name = ev.player.getName();
    const xuid = ev.player.getXuid();
    playerNameMap.set(xuid, name);
});
function setName(xuid, name) {
    playerNameMap.set(xuid, name);
}
exports.setName = setName;
function getName(xuid) {
    return playerNameMap.get(xuid);
}
exports.getName = getName;
function updateStorageFromVersion(storage, version) {
    let newStorage;
    switch (version) {
        case undefined:
            newStorage = (0, storageUpdater_1.updateFromNoVersion)(storage);
            break;
        case 1:
            newStorage = (0, storageUpdater_1.updateFrom1Version)(storage);
            break;
    }
    newStorage.version = CURRENT_STORAGE_VERSION;
    (0, fs_1.writeFileSync)(STORAGE_PATH, JSON.stringify(newStorage, null, 4));
    return newStorage;
}
function getStoredXuidsFromStorage(storage) {
    const retXuids = [];
    const keys = Object.keys(storage);
    for (const key of keys) {
        if (exports.NON_XUID_STORAGE.includes(key)) {
            continue;
        }
        retXuids.push(key);
    }
    return retXuids;
}
exports.getStoredXuidsFromStorage = getStoredXuidsFromStorage;
function createClaimData(claims) {
    const serverClaimsData = [];
    for (const claim of claims) {
        const memberXuids = claim.getMemberXuids();
        const membersData = {};
        for (const xuid of memberXuids) {
            const memberPermMap = claim.getMemberPermissions(xuid);
            const permData = {};
            for (const [permission, value] of memberPermMap.entries()) {
                permData[permission] = value;
            }
            membersData[xuid] = permData;
        }
        serverClaimsData.push({
            owner: claim.owner,
            coOwners: claim.coOwners,
            name: claim.getName(true),
            id: claim.id,
            cornerOne: claim.cornerOne,
            cornerEight: claim.cornerEight,
            dimension: claim.dimension,
            members: membersData
        });
    }
    return serverClaimsData;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZU1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdG9yYWdlTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBK0Y7QUFDL0YsMkNBU3lCO0FBQ3pCLDJCQUErQztBQUMvQyx3Q0FBbUM7QUFDbkMsc0NBQWtDO0FBQ2xDLHlEQU9vQztBQUNwQyxxREFBMkQ7QUFDM0QsaURBQXVEO0FBQ3ZELGtEQUFzRDtBQUN0RCxvQ0FBNkM7QUFDN0Msd0NBQW1DO0FBQ25DLHFEQUF5RTtBQUN6RSxJQUFPLFVBQVUsR0FBRyxlQUFNLENBQUMsVUFBVSxDQUFDO0FBRXRDLE1BQU0sWUFBWSxHQUFHLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQztBQUNyRCxNQUFNLHVCQUF1QixHQUFHLENBQUMsQ0FBQztBQUNyQixRQUFBLGdCQUFnQixHQUFHO0lBQzVCLFNBQVM7SUFDVCxjQUFjO0lBQ2QsY0FBYztDQUNqQixDQUFBO0FBRUQsTUFBTSxhQUFhLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7QUFFckQsTUFBTSxzQkFBc0IsR0FBeUMsRUFBRSxDQUFDLENBQUMsc0JBQXNCO0FBQy9GLE1BQU0scUJBQXFCLEdBQW1ELElBQUksR0FBRyxFQUFFLENBQUM7QUFFeEYsU0FBZ0IscUJBQXFCLENBQUMsUUFBMEM7SUFDNUUsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzFDLENBQUM7QUFGRCxzREFFQztBQUVELFNBQWdCLDhCQUE4QixDQUFDLEdBQVcsRUFBRSxRQUEyQztJQUNuRyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzdDLENBQUM7QUFGRCx3RUFFQztBQUVELFNBQWdCLFFBQVE7SUFDcEIsTUFBTSxJQUFJLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztJQUVoQyxJQUFBLGtCQUFhLEVBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFB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