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