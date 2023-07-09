"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getName = exports.saveData = exports.registerOnRegisteredDataLoaded = exports.registerDataToBeSaved = exports.NON_XUID_STORAGE = void 0;
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
var isFileSync = fsutil_1.fsutil.isFileSync;
const storageUpdater_1 = require("./storageUpdater");
const STORAGE_PATH = __dirname + '\\claimsData.json';
const CURRENT_STORAGE_VERSION = 1;
exports.NON_XUID_STORAGE = [
    "version",
    "serverClaims",
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
        const memberClaimData = [];
        for (const claim of ownedClaims) {
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
            memberClaimData.push({
                owner: claim.owner,
                name: claim.getName(true),
                id: claim.id,
                cornerOne: claim.cornerOne,
                cornerEight: claim.cornerEight,
                dimension: claim.dimension,
                members: membersData
            });
        }
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
    const serverClaimsData = [];
    for (const claim of serverClaims) {
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
            name: claim.getName(true),
            id: claim.id,
            cornerOne: claim.cornerOne,
            cornerEight: claim.cornerEight,
            dimension: claim.dimension,
            members: membersData
        });
    }
    storage.serverClaims = serverClaimsData;
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
            claimIds: group.claimIds,
            members: memberPermissions,
        });
    }
    storage.serverGroups = serverGroupData;
    (0, fs_1.writeFileSync)(STORAGE_PATH, JSON.stringify(storage, null, 4));
    const nativeStorage = dllTypes_1.NativeStorageObject.uglyConstruct(storage);
    (0, dllManager_1.updateStorageInNative)(nativeStorage);
}
exports.saveData = saveData;
function loadData() {
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
    const xuids = Object.keys(data);
    for (const xuid of xuids) {
        const playerData = data[xuid];
        if (exports.NON_XUID_STORAGE.includes(xuid)) {
            continue; // Not player storage
        }
        for (const claimData of playerData.claims) {
            const claim = claim_1.Claim.fromData(claimData);
            (0, claim_1.registerClaim)(claim);
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
        if (Object.keys(playerData).includes('groups')) {
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
    if (data.serverClaims !== undefined) {
        for (const claimData of data.serverClaims) {
            const claim = claim_1.Claim.fromData(claimData);
            (0, claim_1.registerServerClaim)(claim);
        }
    }
    if (data.serverGroups !== undefined) {
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
function getName(xuid) {
    return playerNameMap.get(xuid);
}
exports.getName = getName;
function updateStorageFromVersion(storage, version) {
    let newStorage;
    switch (version) {
        case undefined:
            newStorage = (0, storageUpdater_1.updateFromNoVersion)(storage);
    }
    newStorage.version = CURRENT_STORAGE_VERSION;
    (0, fs_1.writeFileSync)(STORAGE_PATH, JSON.stringify(newStorage, null, 4));
    return newStorage;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZU1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdG9yYWdlTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBK0Y7QUFDL0YsMkNBT3lCO0FBQ3pCLDJCQUErQztBQUMvQyx3Q0FBbUM7QUFDbkMsc0NBQWtDO0FBQ2xDLHlEQU9vQztBQUNwQyxxREFBMkQ7QUFDM0QsaURBQXVEO0FBQ3ZELGtEQUFzRDtBQUN0RCxvQ0FBNkM7QUFDN0Msd0NBQW1DO0FBQ25DLElBQU8sVUFBVSxHQUFHLGVBQU0sQ0FBQyxVQUFVLENBQUM7QUFDdEMscURBQXFEO0FBRXJELE1BQU0sWUFBWSxHQUFHLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQztBQUNyRCxNQUFNLHVCQUF1QixHQUFHLENBQUMsQ0FBQztBQUNyQixRQUFBLGdCQUFnQixHQUFHO0lBQzVCLFNBQVM7SUFDVCxjQUFjO0NBQ2pCLENBQUE7QUFFRCxNQUFNLGFBQWEsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUVyRCxNQUFNLHNCQUFzQixHQUF5QyxFQUFFLENBQUMsQ0FBQyxzQkFBc0I7QUFDL0YsTUFBTSxxQkFBcUIsR0FBbUQsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUV4RixTQUFnQixxQkFBcUIsQ0FBQyxRQUEwQztJQUM1RSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDMUMsQ0FBQztBQUZELHNEQUVDO0FBRUQsU0FBZ0IsOEJBQThCLENBQUMsR0FBVyxFQUFFLFFBQTJDO0lBQ25HLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDN0MsQ0FBQztBQUZELHdFQUVDO0FBRUQsU0FBZ0IsUUFBUTtJQUNwQixNQUFNLGtCQUFrQixHQUFHLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUVuRCxNQUFNLE9BQU8sR0FBUSxFQUFFLENBQUM7SUFFeEIsT0FBTyxDQUFDLE9BQU8sR0FB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