"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoredXuidsFromStorage = exports.getName = exports.setName = exports.updateNativeStorage = exports.generateSaveData = exports.saveData = exports.registerOnRegisteredDataLoaded = exports.registerDataToBeSaved = exports.NON_XUID_STORAGE = void 0;
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