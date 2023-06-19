"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getName = exports.saveData = exports.registerOnRegisteredDataLoaded = exports.registerDataToBeSaved = void 0;
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
const STORAGE_PATH = __dirname + '\\claimsData.json';
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
    const extraData = [];
    for (const callback of dataToBeSavedCallbacks) {
        extraData.push(callback());
    }
    for (const [xuid, name] of playersWithStorage) {
        if (xuid === 'SERVER') {
            storage.serverClaims = (0, claim_1.getOwnedClaims)(xuid);
            continue;
        }
        storage[xuid] = {};
        storage[xuid].claims = (0, claim_1.getOwnedClaims)(xuid);
        storage[xuid].blockInfo = (0, claimBlocksManager_1.getPlayerBlockInfo)(xuid);
        storage[xuid].totalTime = (0, playtime_1.getTotalTime)(xuid);
        storage[xuid].paidTime = (0, playtime_1.getTimeRewardedFor)(xuid);
        storage[xuid].name = playerNameMap.get(xuid);
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
    const xuids = Object.keys(data);
    for (const xuid of xuids) {
        const playerData = data[xuid];
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
        console.log('Canceling it?');
        return common_1.CANCEL;
    }
    const [xuid, name] = playerData;
    playerNameMap.set(xuid, name);
});
function getName(xuid) {
    return playerNameMap.get(xuid);
}
exports.getName = getName;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZU1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdG9yYWdlTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBdUg7QUFDdkgsMkNBQTBGO0FBQzFGLDJCQUErQztBQUMvQyx3Q0FBbUM7QUFDbkMsc0NBQWtDO0FBQ2xDLHlEQU9vQztBQUNwQyxxREFBMkQ7QUFDM0QsaURBQXVEO0FBQ3ZELGtEQUFzRDtBQUN0RCxvQ0FBNkM7QUFDN0Msd0NBQW1DO0FBQ25DLElBQU8sVUFBVSxHQUFHLGVBQU0sQ0FBQyxVQUFVLENBQUM7QUFFdEMsTUFBTSxZQUFZLEdBQUcsU0FBUyxHQUFHLG1CQUFtQixDQUFDO0FBRXJELE1BQU0sYUFBYSxHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFDO0FBRXJELE1BQU0sc0JBQXNCLEdBQXlDLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQjtBQUMvRixNQUFNLHFCQUFxQixHQUFtRCxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBRXhGLFNBQWdCLHFCQUFxQixDQUFDLFFBQTBDO0lBQzVFLHNCQUFzQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBRkQsc0RBRUM7QUFFRCxTQUFnQiw4QkFBOEIsQ0FBQyxHQUFXLEVBQUUsUUFBMkM7SUFDbkcscUJBQXFCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUM3QyxDQUFDO0FBRkQsd0VBRUM7QUFFRCxTQUFnQixRQUFRO0lBQ3BCLE1BQU0sa0JBQWtCLEdBQUcsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRW5ELE1BQU0sT0FBTyxHQUFRLEVBQUUsQ0FBQztJQUV4QixNQUFNLFNBQVMsR0FBaUMsRUFBRSxDQUFDO0lBRW5ELEtBQUssTUFBTSxRQUFRLElBQUksc0JBQXNCLEVBQUU7UUFDM0MsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0tBQzlCO0lB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